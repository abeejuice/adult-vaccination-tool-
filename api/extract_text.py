import os
import json
import fitz  # PyMuPDF

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "..", "Adult Vaccination 2026.pdf")
OUTPUT_JSON = os.path.join(BASE_DIR, "pdf_text.json")

def extract_pdf_test():
    print(f"Extracting text from {PDF_PATH} using PyMuPDF...")
    doc = fitz.open(PDF_PATH)
    pdf_text_data = {}

    for i in range(len(doc)):
        page = doc.load_page(i)
        page_num = i + 1 # 1-based index to match page_001.png
        text = page.get_text()
        pdf_text_data[str(page_num)] = text

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(pdf_text_data, f, indent=2)
    print(f"Extracted {len(doc)} pages to {OUTPUT_JSON}")

if __name__ == "__main__":
    extract_pdf_test()
