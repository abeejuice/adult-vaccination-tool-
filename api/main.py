import os
import json
import re
import mimetypes
from pathlib import Path

# Ensure SVG files are served with the correct MIME type on all platforms
mimetypes.add_type('image/svg+xml', '.svg')
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv
from groq import Groq
from rank_bm25 import BM25Okapi

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL   = "llama-3.3-70b-versatile"
BM25_PAGES   = 2    # vaccine detail pages via BM25 (matrix + condition data handle recommendations)

# Pages excluded from BM25 corpus entirely:
# 1-22:  front matter
# 45-52: recommendation tables — handled via structured matrix + condition sections
# 53-75: upcoming vaccines, conclusion, references, appendix
SKIP_PAGES = set(range(1, 23)) | set(range(45, 53)) | set(range(53, 76))

BASE_DIR     = Path(__file__).parent
PAGES_DIR    = BASE_DIR.parent / "pages"
TEXT_FILE    = BASE_DIR / "pdf_text.json"
MATRIX_FILE  = BASE_DIR / "page52_matrix.json"
CONDITION_DATA_FILE = BASE_DIR / "condition_data.json"
FRONTEND_DIR = BASE_DIR.parent / "frontend" / "dist"

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000"
).split(",")

# ── Load data at startup ───────────────────────────────────────────────────────
def load_all_pages() -> dict:
    """Load all pages (no skip filter) — all_pages used by BM25 corpus builder."""
    if not TEXT_FILE.exists():
        return {}
    return json.loads(TEXT_FILE.read_text(encoding="utf-8"))

all_pages = load_all_pages()

def load_bm25_pages() -> dict:
    """Load only the clinical vaccine detail pages for BM25 indexing."""
    return {k: v for k, v in all_pages.items() if int(k) not in SKIP_PAGES}

bm25_pages    = load_bm25_pages()
bm25_keys     = list(bm25_pages.keys())
bm25_texts    = list(bm25_pages.values())
_corpus       = [text.lower().split() for text in bm25_texts]
bm25_index    = BM25Okapi(_corpus)

# Load page52 recommendation matrix
page52_matrix: dict = {}
if MATRIX_FILE.exists():
    page52_matrix = json.loads(MATRIX_FILE.read_text(encoding="utf-8"))

# Load per-condition structured dose/schedule data
condition_data: dict = {}
if CONDITION_DATA_FILE.exists():
    condition_data = json.loads(CONDITION_DATA_FILE.read_text(encoding="utf-8"))


def format_all_conditions_data(all_conditions: list[str]) -> str:
    """Merge condition_data for all detected conditions.
    Higher-priority condition's dose wins on conflict.
    Conflicts are surfaced explicitly so the clinician sees the override reason.
    """
    if not all_conditions:
        return ""

    # Collect all (priority, condition_key, vaccine_entry) per vaccine name
    vaccine_entries: dict[str, list[tuple[int, str, dict]]] = {}
    for ckey in all_conditions:
        if ckey not in condition_data:
            continue
        col = CONDITION_TO_COLUMN.get(ckey, "at_risk")
        priority = COLUMN_PRIORITY.get(col, 0)
        for v in condition_data[ckey]["vaccines"]:
            name = v["name"]
            vaccine_entries.setdefault(name, []).append((priority, ckey, v))

    if not vaccine_entries:
        return ""

    labels = [condition_data[c]["label"] for c in all_conditions if c in condition_data]
    lines = [f"--- CONDITION-SPECIFIC RECOMMENDATIONS ({' + '.join(labels)}) ---"]

    for name, entries in vaccine_entries.items():
        entries.sort(key=lambda x: -x[0])  # highest priority first
        _, winner_ckey, winner_v = entries[0]

        line = f"• {winner_v['name']}: {winner_v['dose']}"
        if winner_v.get("schedule"):
            line += f" — {winner_v['schedule']}"
        if winner_v.get("booster"):
            line += f" (Booster: {winner_v['booster']})"
        if winner_v.get("notes"):
            line += f" [Note: {winner_v['notes']}]"

        # Surface dose conflicts explicitly so the clinician sees the override
        for _, other_ckey, other_v in entries[1:]:
            if other_v["dose"] != winner_v["dose"]:
                w_label = condition_data[winner_ckey]["label"]
                o_label = condition_data[other_ckey]["label"]
                line += f" [{w_label}: {winner_v['dose']} overrides {o_label}: {other_v['dose']}]"

        lines.append(line)
    lines.append("")
    return "\n".join(lines)


def format_pregnancy_safety_note() -> str:
    """Explicit safety constraints for pregnancy — live vaccines are contraindicated."""
    return (
        "--- PREGNANCY SAFETY CONSTRAINTS ---\n"
        "The following are CONTRAINDICATED during pregnancy (live vaccines) — defer to postpartum:\n"
        "• MMR — live vaccine, do NOT give during pregnancy\n"
        "• Varicella — live vaccine, do NOT give during pregnancy\n"
        "• Shingles (Herpes Zoster) — not recommended during pregnancy\n"
        "• HPV — not recommended during pregnancy\n"
        "• Yellow Fever — avoid unless benefit clearly outweighs risk\n\n"
    )


def get_r_vaccine_names(col: str) -> list[str]:
    """Return names of R-recommended vaccines for BM25 query pivoting."""
    vaccines = page52_matrix.get("vaccines", {})
    return [name for name, codes in vaccines.items() if codes.get(col) == "R"]

# ── Patient profile extraction ────────────────────────────────────────────────
CONDITION_KEYWORDS = {
    "diabetes":   ["diabet", "dm ", " dm,", "dm\n", "t2dm", "t1dm", "iddm", "niddm"],
    "kidney":     ["kidney", "renal", "ckd", "dialysis", "nephrotic", "esrd", "nephrop"],
    "cancer":     ["cancer", "chemo", "malign", "oncol", "lymphom", "leukem", "hodgkin", "myelom"],
    "hiv":        ["hiv", " aids", "immunocompromis", "transplant", "asplenia", "asplenic",
                   "splenectom", "autoimmun", "sickle cell", " scd", "immunosuppress",
                   "cochlear implant", "csf leak", "complement deficien", "down syndrome"],
    "liver":      ["liver", "hepatic", "cirrhosis", "hepatitis c"],
    "heart":      ["heart", "cardiac", "cvd", "coronary", " cad", " ihd", "ischaemic", "ischemic"],
    "lung":       ["lung", "copd", "asthma", "respiratory", "bronchial", "emphysema"],
    "pregnancy":  ["pregnant", "pregnan", "gestation", "trimester", "antenatal", "gravid"],
    "travel":     ["travel", "travell", "trip ", "abroad", "tour ", "journey"],
    "healthcare": ["healthcare worker", "health care worker", "nurse", "hcp", "medical worker", "hospital staff"],
    "lifestyle":  ["alcohol", "smoking", "smoker", "drink"],
}

# Clinical dominance: higher number wins when multiple conditions conflict
COLUMN_PRIORITY = {
    "pregnancy": 5,   # safety-critical — always overrides
    "high_risk": 4,   # CKD, HIV, cancer, transplant
    "at_risk":   3,   # DM, liver, heart, lung
    "special":   2,   # travel, HCP
    "lifestyle": 1,
}

# Maps condition key → matrix column
CONDITION_TO_COLUMN = {
    "diabetes":   "at_risk",
    "liver":      "at_risk",
    "heart":      "at_risk",
    "lung":       "at_risk",
    "kidney":     "high_risk",
    "cancer":     "high_risk",
    "hiv":        "high_risk",
    "pregnancy":  "pregnancy",
    "travel":     "special",
    "healthcare": "special",
    "lifestyle":  "lifestyle",
}

def get_dominant_column(all_conditions: list[str], age: int | None) -> str:
    """Pick the matrix column using clinical dominance rules."""
    # Pregnancy always overrides — safety constraint supersedes age and all conditions
    if "pregnancy" in all_conditions:
        return "pregnancy"
    # Age ≥50 overrides ALL condition-based columns (including high_risk)
    # condition_data for all detected conditions is still appended for dose details
    if age is not None and age >= 50:
        return "50_plus"
    if not all_conditions:
        return "at_risk"
    cols = [CONDITION_TO_COLUMN.get(c, "at_risk") for c in all_conditions]
    return max(cols, key=lambda c: COLUMN_PRIORITY.get(c, 0))


def extract_patient_profile(query: str) -> dict:
    """
    Pure Python patient attribute extraction — zero latency, no API call.
    Returns: {age, col, all_conditions, condition_key, raw_summary}
    Detects ALL matching conditions (not just the first).
    """
    q = query.lower()

    # Extract age: require explicit age-indicator context to avoid clinical numbers
    # (e.g. eGFR 45, BP 80, HbA1c 12 being mistaken for patient age)
    age = None
    age_pattern = re.compile(
        r'\b(\d{1,3})\s*(?:years?\s*old|yr\s*old|y/?o\b|yo\b|-year-old)'  # "30 year old", "30yo", "30-year-old"
        r'|\b(\d{1,3})\s*(?:yr|y)\b'                                        # "30yr", "30y"
        r'|(?:age[d]?|pt\.?|patient)\s*[:\-]?\s*(\d{1,3})\b'               # "age 30", "aged 30", "pt 30"
        r'|\b(\d{1,3})[mMfF]\b',                                            # "30F", "45M" notation
        re.IGNORECASE
    )
    for m in age_pattern.finditer(q):
        # Take the first non-None capture group
        val = next(g for g in m.groups() if g is not None)
        n = int(val)
        if 10 <= n <= 100:
            age = n
            break

    # Detect ALL matching conditions
    all_conditions = [
        ckey for ckey, keywords in CONDITION_KEYWORDS.items()
        if any(kw in q for kw in keywords)
    ]

    col = get_dominant_column(all_conditions, age)

    # Human-readable summary for system prompt
    age_str = f"{age} years old" if age else "adult"
    cond_str = ", ".join(c.replace("_", " ") for c in all_conditions) if all_conditions else ""
    raw_summary = age_str + (f", {cond_str}" if cond_str else "")

    return {
        "age":            age,
        "col":            col,
        "all_conditions": all_conditions,
        "condition_key":  all_conditions[0] if all_conditions else None,  # backward compat
        "raw_summary":    raw_summary,
    }

# ── Format matrix context for LLM ────────────────────────────────────────────
def format_matrix_context(col: str) -> str:
    """Return the patient's column from page52_matrix as readable text."""
    if not page52_matrix:
        return ""
    col_label = page52_matrix.get("columns", {}).get(col, col)
    vaccines   = page52_matrix.get("vaccines", {})
    legend     = page52_matrix.get("legend", {})

    buckets: dict[str, list[str]] = {"R": [], "BR": [], "AR": [], "NR": []}
    for vaccine, codes in vaccines.items():
        code = codes.get(col, "NR")
        buckets.setdefault(code, []).append(vaccine)

    lines = [f"--- PAGE 52: AGE/RISK-WISE RECOMMENDATION MATRIX ({col_label}) ---"]
    for code in ("R", "BR", "AR", "NR"):
        if buckets[code]:
            lines.append(f"{code} [{legend.get(code, code)}]: {', '.join(buckets[code])}")
    lines.append("")
    return "\n".join(lines)

# ── Main context builder ───────────────────────────────────────────────────────
def get_relevant_context(query: str, profile: dict) -> str:
    """
    Build targeted context:
      1. Structured matrix column for dominant age/risk group
      2. Supplementary matrix for travel/HCP if coexisting with a higher-priority condition
      3. Pregnancy safety constraints (if applicable)
      4. Merged condition data for all detected conditions
      5. BM25 vaccine detail pages (pages 23-44), query pivoted to R vaccine names
    """
    parts = []

    # 1. Structured matrix for dominant column
    parts.append(format_matrix_context(profile["col"]))

    # 2. Supplementary matrix for travel/HCP when they didn't win column dominance
    # Travel and HCP are additive (not competing) with medical risk categories
    supplementary = [c for c in profile["all_conditions"]
                     if c in ("travel", "healthcare")
                     and CONDITION_TO_COLUMN.get(c) != profile["col"]]
    for c in supplementary:
        sup_col = CONDITION_TO_COLUMN[c]
        label = condition_data.get(c, {}).get("label", c)
        parts.append(
            f"[SUPPLEMENTARY — patient is also: {label}]\n"
            + format_matrix_context(sup_col)
        )

    # 3. Pregnancy safety constraints (hard guards — must appear before dose context)
    if profile["col"] == "pregnancy":
        parts.append(format_pregnancy_safety_note())

    # 4. Merged condition data for all detected conditions
    if profile["all_conditions"]:
        parts.append(format_all_conditions_data(profile["all_conditions"]))

    # 5. BM25 vaccine detail pages — query pivoted to R vaccine names for this patient
    if bm25_pages:
        r_vaccines = get_r_vaccine_names(profile["col"])
        bm25_query = " ".join(r_vaccines) if r_vaccines else query
        tokens = bm25_query.lower().split()
        scores = bm25_index.get_scores(tokens)
        top_i  = sorted(range(len(scores)), key=lambda i: -scores[i])[:BM25_PAGES]
        top_i.sort(key=lambda i: int(bm25_keys[i]))
        for i in top_i:
            parts.append(f"--- PAGE {bm25_keys[i]} ---\n{bm25_texts[i]}\n\n")

    return "".join(parts)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.mount("/images", StaticFiles(directory=str(PAGES_DIR)), name="images")

if FRONTEND_DIR.exists():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

# ── Request model ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def query_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 2000:
            raise ValueError("Query too long (max 2000 characters)")
        return v

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":        "ok",
        "bm25_pages":    len(bm25_pages),
        "matrix_loaded": bool(page52_matrix),
    }

# ── Chat endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat")
def chat(req: ChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")
    if not all_pages:
        raise HTTPException(status_code=500, detail="PDF text not found. Check api/pdf_text.json")

    profile = extract_patient_profile(req.query)
    context = get_relevant_context(req.query, profile)

    col_label = page52_matrix.get("columns", {}).get(profile["col"], profile["col"])

    system_prompt = (
        f"Patient profile: {profile['raw_summary']}. "
        f"Recommendation category: {col_label}.\n\n"
        "You are an expert clinical assistant for adult vaccinations based on the "
        "Indian Consensus Guidelines on Adult Immunization 2026.\n"
        "The context has two parts:\n"
        "1. A recommendation MATRIX showing R/NR/BR/AR for this patient's risk group.\n"
        "2. CONDITION-SPECIFIC dose/schedule data extracted directly from the guideline tables.\n\n"
        "Rules:\n"
        "- For R vaccines WITH condition-specific dose data: list the vaccine, dose, and schedule.\n"
        "- For R vaccines WITHOUT condition-specific dose data: list them as "
        "'Recommended — verify dose with standard prescribing guidelines.' "
        "Do NOT invent or assume a dose that is not explicitly provided.\n"
        "- Mention BR and AR vaccines briefly as 'may be considered based on individual risk'.\n"
        "- Do NOT mention NR vaccines unless the clinician specifically asks.\n"
        "- If pregnancy safety constraints are provided, always state which vaccines are "
        "contraindicated and must be deferred to postpartum.\n"
        "- Use bullet points. Be concise and clinically precise.\n"
        "At the very end, on its own line, write: "
        "PAGES: followed by comma-separated page numbers you used."
    )

    client = Groq(api_key=GROQ_API_KEY)
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Guidelines:\n{context}\n\nClinician Query: {req.query}"}
        ],
        temperature=0.2,
        max_tokens=600,
    )

    raw_text = completion.choices[0].message.content or ""

    page_numbers = []
    answer = raw_text
    if "PAGES:" in raw_text:
        parts = raw_text.rsplit("PAGES:", 1)
        answer = parts[0].strip()
        page_numbers = [int(p.strip()) for p in re.findall(r'\d+', parts[1])]

    return JSONResponse(content={"answer": answer, "page_numbers": page_numbers})

# ── Serve React frontend (catch-all, must be LAST) ────────────────────────────
@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"error": "Frontend not built. Run: cd frontend && npm run build"})
