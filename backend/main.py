import os
import json
from typing import List, Tuple
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from groq import Groq, AsyncGroq 
from dotenv import load_dotenv
import io

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Setup CORS for local development.
origins = [
    "http://localhost:5173", # Frontend development server
    "http://localhost:3000", # Another common frontend development port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)

# --- CHANGE: Initialize Groq Client ---
# The API key is loaded from the .env file by load_dotenv()
aclient = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

async def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, int]:
    """
    Extracts text from PDF bytes, marking page numbers, and returns the concatenated
    text along with the total number of pages.
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        full_text = ""
        page_count = len(reader.pages) # Get total page count
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                # Add page markers to help the LLM locate evidence
                full_text += f"\n--- PAGE {i+1} ---\n{text}"
        return full_text, page_count # Return both extracted text and page count
    except Exception as e:
        print(f"Error reading PDF: {e}")
        raise HTTPException(status_code=400, detail="Invalid PDF file or unable to extract text.")

async def analyze_rule_with_llm(document_text: str, rule: str):
    """
    Sends document text and a single rule to the LLM for verification and
    returns a structured JSON analysis.
    """
    
    system_prompt = """You are an expert compliance auditor. Your task is to check a document against a specific rule.
You must strictly output valid JSON only. Do not include any markdown formatting (like ```json)."""

    truncated_document_text = document_text[:25000] 

    user_prompt = f"""
Here is the extracted text from a document (with page markers like '--- PAGE X ---'):
<document_text>
{truncated_document_text}
</document_text>

Analyze the document text carefully against this specific rule:
Rule: "{rule}"

Instructions:
1. Determine if the rule passes or fails based on the text.
2. Find the *single best sentence or phrase* from the text that acts as evidence. Include the page marker if available nearby (e.g., "Found on Page 3: 'The exact quote sentence'"). If it fails and no specific evidence exists, state "N/A".
3. Provide a very short and concise reasoning (1-2 sentences) for your decision.
4. Provide a confidence score (integer 0-100) for your assessment, where 100 is absolute certainty.

Return a JSON object in precisely this format, ensuring all fields are present:
{{
"status": "pass" or "fail" or "error",
"evidence": "Found on Page X: 'The exact quote sentence'" or "N/A",
"reasoning": "Short explanation why it passed or failed.",
"confidence": 90
}}
"""

    try:
        response = await aclient.chat.completions.create(
            # --- CHANGE: Specify a Groq-supported model ---
            model="llama-3.3-70b-versatile", # Recommended for good balance, or 'llama3-70b-8192' for more power
            # The response_format is very similar to OpenAI's
            response_format={"type": "json_object"}, 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1, 
        )
        
        result_json = json.loads(response.choices[0].message.content)
        result_json['rule'] = rule 
        
        if not all(k in result_json for k in ["status", "evidence", "reasoning", "confidence"]):
            raise ValueError("LLM response missing expected fields.")
            
        return result_json
        
    except json.JSONDecodeError as e:
        print(f"LLM did not return valid JSON: {response.choices[0].message.content}")
        return {
            "rule": rule,
            "status": "error",
            "evidence": "LLM response was not valid JSON.",
            "reasoning": f"JSON parsing error: {e}",
            "confidence": 0
        }
    except Exception as e:
        print(f"Error communicating with LLM or processing its response: {e}")
        # It's good practice to print the full traceback for debugging server-side errors
        import traceback
        traceback.print_exc() 
        return {
            "rule": rule,
            "status": "error",
            "evidence": "LLM processing failed.",
            "reasoning": f"An internal error occurred: {e}",
            "confidence": 0
        }

@app.post("/analyze")
async def analyze_pdf(
    pdf: UploadFile = File(...), 
    rule1: str = Form(...),
    rule2: str = Form(...),
    rule3: str = Form(...)
):
    """
    Receives a PDF file and three rules, extracts text, sends each rule
    to an LLM for analysis, and returns a consolidated JSON response.
    """
    if not pdf.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF.")
    
    file_bytes = await pdf.read()
    document_text, page_count = await extract_text_from_pdf(file_bytes)

    if not document_text.strip():
         raise HTTPException(status_code=400, detail="Could not extract any readable text from the PDF. It might be an image-only (scanned) PDF.")
    
    rules_to_process = [rule1, rule2, rule3]
    results_list = []

    for rule in rules_to_process:
        if rule.strip(): 
            analysis_result = await analyze_rule_with_llm(document_text, rule)
            results_list.append(analysis_result)

    return {
        "result": results_list,
        "meta": {
            "pagesCount": page_count,
            "filename": pdf.filename
        }
    }