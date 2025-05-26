# API Design Documentation

## Base URL
`http://localhost:8000`

## Authentication
Currently no authentication required (development mode)

## Endpoints

### 1. Health Check
**GET** `/api/health`

Check API health and view current model configuration.

**Response:**
```json
{
    "status": "healthy",
    "watsonx_configured": true,
    "model_config": {
        "model_id": "mistralai/mistral-medium-2505",
        "max_new_tokens": 2000,
        "temperature": 0.5,
        "top_p": 0.95
    }
}
```

### 2. List Sample Images
**GET** `/api/samples`

Get list of available sample images.

**Response:**
```json
{
    "samples": [
        {
            "name": "invoice.png",
            "path": "/samples/invoice.png",
            "size": 45632
        }
    ]
}
```

### 3. Process Sample Image
**POST** `/api/ocr/sample/{filename}`

Process a pre-loaded sample image.

**Parameters:**
- `filename` (path) - Name of the sample file

**Response:**
```json
{
    "success": true,
    "filename": "invoice.png",
    "result": {
        "document_type": "invoice",
        "extracted_text": {
            "raw_text": "INVOICE #123...",
            "structured_data": {
                "invoice_number": "123",
                "date": "2024-01-25",
                "items": [
                    {
                        "description": "Widget",
                        "quantity": 10,
                        "price": 25.00,
                        "total": 250.00
                    }
                ],
                "total": 540.00
            }
        },
        "metadata": {
            "language": "english",
            "confidence": "high",
            "special_elements": ["table", "totals"]
        }
    }
}
```

### 4. Process Uploaded Image
**POST** `/api/ocr/upload`

Upload and process a new image.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing the image

**Example using curl:**
```bash
curl -X POST http://localhost:8000/api/ocr/upload \
  -F "file=@/path/to/image.png"
```

**Response:**
Same structure as sample image processing

## Error Responses

### 400 Bad Request
```json
{
    "detail": "File must be an image"
}
```

### 404 Not Found
```json
{
    "detail": "Sample image not found"
}
```

### 500 Internal Server Error
```json
{
    "detail": "Error processing image with watsonx: [error details]"
}
```

## Static Files
**GET** `/samples/{filename}`

Serve sample images directly.

## Response Structure

All OCR responses follow this structure:
```typescript
interface OCRResult {
    document_type: string;  // "invoice", "receipt", "form", etc.
    extracted_text: {
        raw_text: string;   // Original extracted text
        structured_data: {  // Varies by document type
            [key: string]: any;
        }
    };
    metadata: {
        language: string;   // Detected language
        confidence: "high" | "medium" | "low";
        special_elements: string[];  // ["tables", "signatures", etc.]
    };
}
```

## Rate Limiting
Currently no rate limiting implemented (development mode)

## CORS Policy
- Allowed Origins: `http://localhost:3000`
- Allowed Methods: All
- Allowed Headers: All

## WebSocket Support
Not implemented - all operations are REST-based

## Future API Enhancements
1. Add authentication/API keys
2. Implement rate limiting
3. Add batch processing endpoint
4. Add webhook support for async processing
5. Add image preprocessing options
6. Support for PDF upload