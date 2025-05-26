# OCR Document Processor with IBM watsonx.ai

## Project Overview
This is a full-stack web application that performs OCR (Optical Character Recognition) on documents using IBM watsonx.ai's multimodal AI models. The application extracts text from images and structures the information in a meaningful way.

## Key Features
- **Multimodal AI Processing**: Uses IBM watsonx.ai vision models to extract text from images
- **Dual Input Methods**: Users can select pre-loaded sample images or upload their own
- **Structured Output**: Extracts not just raw text but organizes it into structured data
- **Modern UI**: Beautiful React interface with smooth animations and responsive design
- **Configurable**: Model and parameters can be configured via environment variables

## Technology Stack
- **Backend**: Python FastAPI
- **Frontend**: React with TypeScript
- **AI/ML**: IBM watsonx.ai (mistralai/mistral-medium-2505 or other vision models)
- **Styling**: CSS with Framer Motion for animations
- **State Management**: React hooks

## Architecture
```
ocr-app/
├── server/          # FastAPI backend
│   ├── app.py      # Main API server
│   └── .env        # Configuration (API keys, model settings)
├── client/          # React frontend
│   └── src/
│       ├── App.tsx  # Main React component
│       └── App.css  # Styles
└── samples/         # Sample images for testing
```

## API Endpoints
- `GET /api/samples` - List available sample images
- `POST /api/ocr/sample/{filename}` - Process a sample image
- `POST /api/ocr/upload` - Process an uploaded image
- `GET /api/health` - Health check with model configuration

## Environment Variables
- `WATSONX_API_KEY` - IBM watsonx.ai API key
- `WATSONX_PROJECT_ID` - Project ID in watsonx.ai
- `WATSONX_URL` - watsonx.ai endpoint URL
- `WATSONX_MODEL_ID` - Vision model to use (e.g., mistralai/mistral-medium-2505)
- `WATSONX_MAX_NEW_TOKENS` - Maximum tokens for response
- `WATSONX_TEMPERATURE` - Model temperature (0-1)
- `WATSONX_TOP_P` - Top-p sampling parameter

## Key Implementation Details

### Image Processing Flow
1. User selects/uploads an image
2. Image is encoded to base64
3. Sent to watsonx.ai vision model via chat API
4. Model extracts and structures text
5. Results displayed with document type, raw text, and structured data

### Multimodal Chat Format
The app uses the standard multimodal message format:
```python
messages = [{
    "role": "user",
    "content": [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
        {"type": "text", "text": "Extract text and structure it..."}
    ]
}]
```

## Testing
- Add test images to the `samples/` folder
- Use the health endpoint to verify configuration
- Test both sample selection and file upload flows

## Common Issues and Solutions
1. **Token Limit Exceeded**: Large images may exceed model limits - consider resizing
2. **Model Not Found**: Ensure the model ID in .env is correct and available
3. **CORS Errors**: Backend allows localhost:3000 by default

## Future Enhancements
- Add image preprocessing (resize, enhance)
- Support for PDF documents
- Batch processing capability
- Export results to various formats
- Add more specialized models for specific document types