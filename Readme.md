# NIYAMR AI — PDF Rule Checker

Lightweight web app to upload a PDF and check it against custom rules using an LLM backend.

## Project layout
- backend/ — FastAPI backend that extracts PDF text and queries an LLM  
- frontend/ — React + Vite UI

Quick references:
- Backend entry: [`main.analyze_pdf`](backend/main.py) — handles /analyze POST
- Core backend helpers: [`main.extract_text_from_pdf`](backend/main.py), [`main.analyze_rule_with_llm`](backend/main.py)
- Frontend main component: [`App`](frontend/src/App.jsx)
- Frontend entry: [frontend/src/main.jsx](frontend/src/main.jsx)
- Frontend config: [frontend/package.json](frontend/package.json)

## Prerequisites
- Node 18+ and npm
- Python 3.10+
- (Optional) virtualenv for Python

## Backend — setup & run
1. Create and activate a virtual environment:
   - Windows: python -m venv .venv && .venv\Scripts\activate
   - macOS/Linux: python -m venv .venv && source .venv/bin/activate

2. Install dependencies:
   - pip install -r backend/requirements.txt

3. Configure secrets:
   - Put your GROQ API key in `backend/.env` as GROQ_API_KEY (the repo currently contains a .env file; replace with your key or update as needed).

4. Run the dev server:
   - From project root: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   - Or: cd backend && uvicorn main:app --reload --port 8000

Notes:
- CORS origins are set in [backend/main.py](backend/main.py). Update allowed origins if your frontend runs elsewhere.

## Frontend — setup & run
1. Install:
   - cd frontend && npm install

2. Run dev server:
   - npm run dev

3. Open the app:
   - Visit the Vite dev URL (usually http://localhost:5173). The frontend posts to `http://localhost:8000/analyze` by default.

## API
POST /analyze
- Content type: multipart/form-data
- Fields:
  - pdf: file (PDF)
  - rule1, rule2, rule3: strings
- Implemented in: [`main.analyze_pdf`](backend/main.py)

Response shape:
```json
{
  "result": [ { "rule": "...", "status": "pass|fail|error", "evidence": "...", "reasoning": "...", "confidence": 90 }, ... ],
  "meta": { "pagesCount": 5, "filename": "doc.pdf" }
}