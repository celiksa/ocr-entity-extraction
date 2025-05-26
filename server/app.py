from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import base64
import os
from typing import Dict, Any, List
import uvicorn
from pathlib import Path
import logging
from dotenv import load_dotenv
import json
from pdf2image import convert_from_path, convert_from_bytes
from PIL import Image
import io
import tempfile
import requests
from datetime import datetime, timedelta

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OCR Document Processor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount samples directory for static file serving
current_dir = Path(__file__).parent
samples_dir = current_dir.parent / "samples"
app.mount("/samples", StaticFiles(directory=str(samples_dir)), name="samples")

# WatsonX.ai configuration
WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")

# Model configuration from environment
MODEL_ID = os.getenv("WATSONX_MODEL_ID", "mistralai/mistral-medium-2505")
MAX_TOKENS = int(os.getenv("WATSONX_MAX_TOKENS", "16000"))
TEMPERATURE = float(os.getenv("WATSONX_TEMPERATURE", "0.1"))
TOP_P = float(os.getenv("WATSONX_TOP_P", "0.95"))

# Token management
access_token = None
token_expiry = None

def get_access_token():
    """Get or refresh IBM Cloud access token"""
    global access_token, token_expiry
    
    # Check if we have a valid token
    if access_token and token_expiry and datetime.now() < token_expiry:
        return access_token
    
    # Get new token
    token_url = "https://iam.cloud.ibm.com/identity/token"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }
    data = {
        "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
        "apikey": WATSONX_API_KEY
    }
    
    try:
        response = requests.post(token_url, headers=headers, data=data)
        response.raise_for_status()
        
        token_data = response.json()
        access_token = token_data["access_token"]
        # Set expiry to 50 minutes from now (tokens last 60 minutes)
        token_expiry = datetime.now() + timedelta(minutes=50)
        
        return access_token
    except Exception as e:
        logger.error(f"Error getting access token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to authenticate with IBM Cloud")

def encode_image_to_base64(image_data: bytes) -> str:
    """Encode image bytes to base64 string"""
    return base64.b64encode(image_data).decode('utf-8')

def convert_pdf_to_images(pdf_data: bytes) -> List[bytes]:
    """Convert PDF pages to images"""
    images = []
    try:
        # Convert PDF to images
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_data)
            tmp_file_path = tmp_file.name
        
        # Convert PDF pages to images
        pdf_images = convert_from_path(tmp_file_path, dpi=200)
        
        # Convert PIL images to bytes
        for img in pdf_images:
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            images.append(img_byte_arr.getvalue())
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
    except Exception as e:
        logger.error(f"Error converting PDF: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to process PDF: {str(e)}")
    
    return images

def is_pdf_file(filename: str) -> bool:
    """Check if file is a PDF"""
    return filename.lower().endswith('.pdf')

async def process_image_with_watsonx(image_data: bytes) -> Dict[str, Any]:
    """Process image using watsonx.ai multimodal chat via HTTP API"""
    try:
        # Convert image to base64
        image_base64 = encode_image_to_base64(image_data)
        
        # Get access token
        token = get_access_token()
        
        # API endpoint
        url = f"{WATSONX_URL}/ml/v1/text/chat?version=2023-05-29"
        
        # System prompt
        system_prompt = """You are an advanced entity extraction system. Analyze this document image and extract ALL entities with their values in a highly structured format.

CRITICAL: Focus on extracting EVERY entity (person names, organizations, dates, amounts, addresses, phone numbers, emails, IDs, etc.) from the document.

Provide the extracted information in the following JSON format:
{
    "document_type": "specific type (e.g., invoice, receipt, bank statement, ID card, contract, etc.)",
    "entities": {
        "people": [
            {"name": "full name", "role": "their role/title if mentioned"}
        ],
        "organizations": [
            {"name": "company/org name", "type": "company/bank/government/etc"}
        ],
        "dates": [
            {"value": "date value", "type": "issue_date/due_date/transaction_date/etc"}
        ],
        "amounts": [
            {"value": "numeric value", "currency": "USD/EUR/etc", "type": "total/subtotal/tax/payment/etc"}
        ],
        "addresses": [
            {"full_address": "complete address", "type": "billing/shipping/business/etc"}
        ],
        "identifiers": [
            {"value": "ID value", "type": "invoice_number/account_number/tax_id/etc"}
        ],
        "contact_info": [
            {"value": "phone/email/website", "type": "phone/email/website"}
        ],
        "items": [
            {"description": "item name", "quantity": "amount", "unit_price": "price", "total": "total"}
        ],
        "other_entities": [
            {"entity": "entity name", "value": "entity value", "type": "classification"}
        ]
    },
    "extracted_text": {
        "raw_text": "complete text from the document"
    },
    "metadata": {
        "language": "detected language",
        "confidence": "high/medium/low",
        "document_condition": "clear/blurry/partial",
        "special_elements": ["tables", "logos", "signatures", "stamps", "barcodes", "qr_codes"]
    }
}

IMPORTANT: Extract EVERY piece of information as an entity. Be thorough and precise. Return ONLY valid JSON."""

        # Request body
        body = {
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all entities from this document image."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            "project_id": PROJECT_ID,
            "model_id": MODEL_ID,
            "frequency_penalty": 0,
            "max_tokens": MAX_TOKENS,
            "presence_penalty": 0,
            "temperature": TEMPERATURE,
            "top_p": TOP_P
        }
        
        # Headers
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        # Make request
        response = requests.post(url, headers=headers, json=body)
        
        if response.status_code != 200:
            logger.error(f"WatsonX API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"WatsonX API error: {response.text}")
        
        # Parse response
        data = response.json()
        
        # Extract the assistant's response
        if 'choices' in data and len(data['choices']) > 0:
            response_text = data['choices'][0]['message']['content']
        else:
            logger.error(f"Unexpected response format: {data}")
            raise HTTPException(status_code=500, detail="Unexpected response format from WatsonX API")
        
        # Clean and parse JSON response
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        try:
            result = json.loads(response_text)
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {str(e)}, Response: {response_text}")
            # Return a structured error response
            return {
                "document_type": "unknown",
                "entities": {},
                "extracted_text": {
                    "raw_text": response_text
                },
                "metadata": {
                    "language": "unknown",
                    "confidence": "low",
                    "document_condition": "error",
                    "special_elements": [],
                    "error": "Failed to parse response as JSON"
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image with watsonx: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_multiple_images(images: List[bytes]) -> Dict[str, Any]:
    """Process multiple images (e.g., from PDF pages) and combine results"""
    all_results = []
    combined_text = []
    combined_structured_data = {}
    
    for i, image_data in enumerate(images):
        try:
            result = await process_image_with_watsonx(image_data)
            result['page_number'] = i + 1
            all_results.append(result)
            
            # Combine raw text
            combined_text.append(f"--- Page {i + 1} ---")
            combined_text.append(result['extracted_text']['raw_text'])
            
            # Combine structured data
            if result['extracted_text']['structured_data']:
                combined_structured_data[f'page_{i + 1}'] = result['extracted_text']['structured_data']
                
        except Exception as e:
            logger.error(f"Error processing page {i + 1}: {str(e)}")
            all_results.append({
                'page_number': i + 1,
                'error': str(e)
            })
    
    # Return combined results
    return {
        "document_type": "multi-page document",
        "total_pages": len(images),
        "extracted_text": {
            "raw_text": "\n\n".join(combined_text),
            "structured_data": combined_structured_data
        },
        "metadata": {
            "language": all_results[0].get('metadata', {}).get('language', 'unknown') if all_results else 'unknown',
            "confidence": "medium",
            "special_elements": ["multiple pages"],
            "page_results": all_results
        }
    }

def get_directory_structure(path: Path, base_path: Path) -> Dict[str, Any]:
    """Get directory structure recursively"""
    # For the root, path will be "."
    rel_path = path.relative_to(base_path)
    path_str = str(rel_path) if str(rel_path) != "." else ""
    
    structure = {
        "name": path.name,
        "path": path_str,
        "type": "folder" if path.is_dir() else "file",
        "children": []
    }
    
    if path.is_dir():
        for item in sorted(path.iterdir()):
            if item.name.startswith('.'):
                continue
            if item.is_dir():
                structure["children"].append(get_directory_structure(item, base_path))
            elif item.suffix.lower() in ['.jpg', '.jpeg', '.png', '.pdf', '.bmp', '.gif']:
                # Remove the leading "./" if present
                item_path = str(item.relative_to(base_path))
                structure["children"].append({
                    "name": item.name,
                    "path": item_path,
                    "type": "file",
                    "size": item.stat().st_size
                })
    
    return structure

@app.get("/")
async def root():
    return {"message": "OCR Document Processor API"}

@app.get("/api/samples")
async def get_samples():
    """Get hierarchical structure of sample files and folders"""
    # Get the absolute path to samples directory
    current_dir = Path(__file__).parent
    samples_dir = current_dir.parent / "samples"
    
    if not samples_dir.exists():
        samples_dir.mkdir(exist_ok=True)
    
    structure = get_directory_structure(samples_dir, samples_dir)
    return {"structure": structure}

@app.post("/api/ocr/sample/{filename:path}")
async def ocr_sample_image(filename: str):
    """Process a sample image or PDF"""
    # Get the absolute path to samples directory
    current_dir = Path(__file__).parent
    samples_dir = current_dir.parent / "samples"
    sample_path = samples_dir / filename
    
    logger.info(f"Processing sample file: {filename}")
    logger.info(f"Full path: {sample_path}")
    logger.info(f"Path exists: {sample_path.exists()}")
    
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail=f"Sample file not found: {filename}")
    
    try:
        with open(sample_path, "rb") as f:
            file_data = f.read()
        
        if is_pdf_file(filename):
            # Convert PDF to images and process each page
            images = convert_pdf_to_images(file_data)
            result = await process_multiple_images(images)
        else:
            # Process single image
            result = await process_image_with_watsonx(file_data)
        
        return JSONResponse(content={
            "success": True,
            "filename": filename,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error processing sample file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ocr/upload")
async def ocr_upload_image(file: UploadFile = File(...)):
    """Process an uploaded image or PDF"""
    allowed_types = ['image/', 'application/pdf']
    
    if not any(file.content_type.startswith(t) for t in allowed_types):
        raise HTTPException(status_code=400, detail="File must be an image or PDF")
    
    try:
        contents = await file.read()
        
        if file.content_type == 'application/pdf' or is_pdf_file(file.filename):
            # Convert PDF to images and process each page
            images = convert_pdf_to_images(contents)
            result = await process_multiple_images(images)
        else:
            # Process single image
            result = await process_image_with_watsonx(contents)
        
        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error processing uploaded file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "watsonx_configured": bool(os.getenv("WATSONX_API_KEY")),
        "model_config": {
            "model_id": MODEL_ID,
            "max_tokens": MAX_TOKENS,
            "temperature": TEMPERATURE,
            "top_p": TOP_P
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)