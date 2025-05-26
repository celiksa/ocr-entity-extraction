# System Architecture

## Overview
The OCR Document Processor follows a client-server architecture with AI processing handled by IBM watsonx.ai cloud services.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  React App  │────▶│   FastAPI   │
│             │◀────│  (Client)   │◀────│  (Server)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ IBM watsonx │
                                        │     .ai     │
                                        └─────────────┘
```

## Component Details

### Frontend (React + TypeScript)

**Key Components:**
- `App.tsx` - Main component managing:
  - State management (samples, processing status, results)
  - Tab navigation (samples vs upload)
  - API communication
  - Result display

**UI Features:**
- Responsive design with gradient background
- Tab-based interface for input methods
- Drag-and-drop file upload
- Animated transitions using Framer Motion
- Real-time processing feedback

**State Management:**
```typescript
- samples: Sample[] - List of available sample images
- processing: boolean - Loading state
- result: ProcessingResult | null - OCR results
- error: string | null - Error messages
- activeTab: 'samples' | 'upload' - Current tab
```

### Backend (FastAPI + Python)

**Core Modules:**
- `app.py` - Main FastAPI application
  - CORS middleware configuration
  - Static file serving for samples
  - API endpoint handlers
  - watsonx.ai integration

**Key Functions:**
1. `encode_image_to_base64()` - Convert image bytes to base64
2. `process_image_with_watsonx()` - Main OCR processing logic
3. `get_samples()` - List available sample images
4. `ocr_sample_image()` - Process pre-loaded samples
5. `ocr_upload_image()` - Process uploaded images

### IBM watsonx.ai Integration

**Connection Flow:**
1. Initialize credentials from environment variables
2. Create ModelInference instance with model configuration
3. Format multimodal message with image and prompt
4. Send to chat API
5. Parse and structure response

**Message Format:**
```python
{
    "role": "user",
    "content": [
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base64}"}
        },
        {
            "type": "text",
            "text": "OCR extraction prompt..."
        }
    ]
}
```

## Data Flow

### Sample Image Processing
1. User clicks sample image in UI
2. React sends POST to `/api/ocr/sample/{filename}`
3. Server reads image from disk
4. Converts to base64
5. Sends to watsonx.ai
6. Parses response and returns structured data
7. UI displays results

### Upload Processing
1. User drags/selects image file
2. React sends multipart POST to `/api/ocr/upload`
3. Server receives file bytes
4. Converts to base64
5. Sends to watsonx.ai
6. Parses response and returns structured data
7. UI displays results

## Configuration Management

**Environment Variables:**
- Credentials stored in `.env` file
- Model parameters configurable
- Loaded at startup using python-dotenv

**Configurable Parameters:**
- API credentials (key, project ID, URL)
- Model selection
- Generation parameters (tokens, temperature, top_p)

## Error Handling

**Frontend:**
- Try-catch blocks around API calls
- User-friendly error messages
- Loading states during processing

**Backend:**
- HTTP exceptions with appropriate status codes
- Logging for debugging
- Graceful fallbacks for parsing errors

## Security Considerations

**Current Implementation:**
- API keys in environment variables
- CORS restricted to localhost:3000
- No authentication (development mode)

**Production Recommendations:**
1. Add API authentication
2. Implement rate limiting
3. Use HTTPS
4. Validate file types and sizes
5. Sanitize extracted text
6. Add request signing

## Performance Optimization

**Current Approach:**
- Direct base64 encoding
- Synchronous processing
- Single file at a time

**Potential Improvements:**
1. Image preprocessing (resize, compress)
2. Caching for repeated requests
3. Async/queue-based processing
4. Batch processing support
5. CDN for static samples

## Deployment Architecture

**Development:**
```
Local Machine
├── FastAPI (port 8000)
├── React Dev Server (port 3000)
└── watsonx.ai (cloud)
```

**Production Recommendation:**
```
Load Balancer
├── React App (static hosting/CDN)
├── FastAPI (containerized)
│   ├── Multiple instances
│   └── Shared cache layer
└── watsonx.ai (cloud)
```

## Monitoring and Logging

**Current:**
- Console logging
- Basic error tracking

**Recommended:**
- Structured logging
- Request/response tracking
- Performance metrics
- Error alerting
- Usage analytics