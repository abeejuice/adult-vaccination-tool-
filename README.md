# GalenAI — Adult Vaccination Clinical Decision Support

AI-powered clinical decision support for adult immunization, based on the **Indian Consensus Guidelines on Adult Immunization 2026**. Ask about a patient's age and conditions; GalenAI returns vaccine recommendations, schedules, contraindications, and relevant guideline pages.

Live on Railway. Backend serves the built React frontend as static files — single deployment, no separate CDN needed.

---

## What it does

- **AI chat**: Describe a patient ("65yo with diabetes and CKD") and get structured vaccine recommendations with dose schedules
- **Patient profiling**: Extracts age and conditions from free text; applies a clinical dominance hierarchy (pregnancy > high-risk > at-risk > special > lifestyle)
- **RAG over guidelines**: BM25 search over guideline PDF pages surfaces the 2 most relevant pages per query, shown inline with a lightbox viewer
- **Vaccine browser**: All 21 vaccines with recommendations by patient group, formulations, contraindications, special populations
- **Comorbidity filter**: Filter the vaccine list by condition (diabetes, CKD, HIV, pregnancy, etc.)

---

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Python 3.14, FastAPI, Uvicorn |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Search | BM25 (`rank_bm25`) over extracted PDF text |
| PDF parsing | PyMuPDF |
| Frontend | React 18, TypeScript, Vite |
| Animations | Framer Motion |
| Routing | React Router v6 |
| Toasts | Sonner |
| Deployment | Railway (single service) |

---

## Local setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Groq API key — get one free at [console.groq.com](https://console.groq.com)

### Backend

```bash
cd api
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r ../requirements.txt

cp .env.example .env
# Edit .env and set GROQ_API_KEY=your_key_here

uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. The API docs are at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies API calls to `:8000`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for LLM inference |
| `PORT` | Railway only | Set automatically by Railway |

Create `api/.env` (not committed):
```
GROQ_API_KEY=gsk_...
```

---

## Project structure

```
adult-vaccination-tool/
├── api/
│   ├── main.py              # FastAPI app — chat endpoint, BM25 search, static file serving
│   ├── pdf_text.json        # Extracted text from guideline PDF (pages 23–44)
│   ├── page52_matrix.json   # Structured recommendation matrix by age/risk group
│   ├── condition_data.json  # Per-condition dose/schedule data
│   └── images/              # Guideline PDF page images (page_023.png … page_052.png)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx     # Vaccine browser, search, comorbidity filters
│   │   │   ├── Chat.tsx     # AI conversation, lightbox PDF viewer
│   │   │   └── VaccineDetail.tsx  # Per-vaccine detail drawer/page
│   │   ├── assets/          # GalenAI logo SVGs (base64-inlined at build)
│   │   └── index.css        # Design system — GalenAI brand tokens
│   ├── dist/                # Built output — committed so Railway can serve it
│   └── vite.config.ts
├── Procfile                 # Railway: web: cd api && uvicorn main:app ...
└── requirements.txt
```

---

## Deployment (Railway)

The app is configured for Railway as a single service. The FastAPI backend mounts the built `frontend/dist/` as static files, so no separate frontend deployment is needed.

1. Push to `main` — Railway auto-deploys
2. Set the `GROQ_API_KEY` environment variable in Railway dashboard
3. The `Procfile` handles the rest: `web: cd api && uvicorn main:app --host 0.0.0.0 --port $PORT`

**Note:** `frontend/dist/` is committed to the repo intentionally so Railway can serve the built frontend without a Node.js build step during deployment.

---

## How the AI works

1. **Patient profiling** — Regex-based extraction of age (requires explicit context like "65yo", "age 30") and conditions from free text. No API call needed.
2. **Clinical dominance** — Conditions are ranked: pregnancy (5) > high-risk CKD/HIV/cancer (4) > at-risk DM/liver/heart/lung (3) > special HCW/travel (2) > lifestyle (1). The highest-priority condition determines which recommendation column is used.
3. **Context assembly** — The recommendation matrix, condition-specific dose data, pregnancy safety constraints, and top 2 BM25-matched guideline pages are assembled into a structured prompt.
4. **LLM inference** — Groq streams a structured clinical response using `llama-3.3-70b-versatile`.
