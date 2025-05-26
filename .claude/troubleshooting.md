# Troubleshooting Guide

## Common Issues and Solutions

### 1. Token Limit Exceeded Error
**Error:** `"the number of input tokens XXXXX cannot exceed the total tokens limit 131072"`

**Cause:** Image is too large when converted to base64

**Solutions:**
- Resize images before uploading (recommended max: 1920x1080)
- Use a model with higher token limits
- Implement image compression before encoding
- Consider using `meta-llama/llama-3-2-11b-vision-instruct` which may handle images more efficiently

### 2. Import Error: FoundationModelExtensions
**Error:** `ImportError: cannot import name 'FoundationModelExtensions' from 'ibm_watsonx_ai'`

**Cause:** This import doesn't exist in the current SDK

**Solution:** Use `ModelInference` instead (already fixed in current code)

### 3. Model Not Found
**Error:** `Model 'model-name' not found`

**Cause:** Invalid model ID or model not available in your region

**Solutions:**
- Check available models in your watsonx.ai project
- Verify model ID in `.env` file
- Try these vision models:
  - `mistralai/mistral-medium-2505`
  - `meta-llama/llama-3-2-90b-vision-instruct`
  - `meta-llama/llama-3-2-11b-vision-instruct`

### 4. API Key Authentication Failed
**Error:** `401 Unauthorized`

**Cause:** Invalid or missing API credentials

**Solutions:**
1. Verify `.env` file exists in server directory
2. Check API key is correct and active
3. Ensure project ID matches your watsonx.ai project
4. Verify the URL matches your region

### 5. CORS Policy Error
**Error:** `Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solutions:**
- Ensure backend is running on port 8000
- Check CORS middleware configuration in `app.py`
- Restart both frontend and backend servers

### 6. No Text Extracted
**Symptom:** OCR returns empty or minimal text

**Possible Causes:**
- Poor image quality
- Image is not text-based (e.g., photos without text)
- Wrong model for the task

**Solutions:**
- Use high-quality, well-lit images
- Ensure text is clearly visible
- Try different models
- Check image orientation

### 7. JSON Parsing Error
**Error:** `json.JSONDecodeError`

**Cause:** Model response isn't valid JSON

**Solutions:**
- Check temperature setting (lower = more consistent)
- Ensure prompt clearly asks for JSON format
- The code already handles this with fallback

### 8. Server Won't Start
**Error:** Various startup errors

**Checklist:**
1. Virtual environment activated: `source venv/bin/activate`
2. Dependencies installed: `pip install -r requirements.txt`
3. Port 8000 not in use: `lsof -i :8000`
4. Python version 3.8+: `python --version`

### 9. Frontend Build Errors
**Common Issues:**
- Missing dependencies: `npm install`
- TypeScript errors: Check `App.tsx` for type issues
- Port 3000 in use: Change port or kill process

### 10. Slow Processing
**Symptoms:** Long wait times for OCR results

**Solutions:**
- Check internet connection to watsonx.ai
- Reduce `max_new_tokens` in `.env`
- Use a smaller model
- Implement progress indicators

## Debugging Tips

### Enable Detailed Logging
Add to `app.py`:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test API Directly
```bash
# Health check
curl http://localhost:8000/api/health

# List samples
curl http://localhost:8000/api/samples

# Test with sample
curl -X POST http://localhost:8000/api/ocr/sample/sample-invoice.txt
```

### Check Environment Variables
```python
# Add to app.py temporarily
@app.get("/api/debug-env")
async def debug_env():
    return {
        "api_key_set": bool(os.getenv("WATSONX_API_KEY")),
        "project_id_set": bool(os.getenv("WATSONX_PROJECT_ID")),
        "model_id": os.getenv("WATSONX_MODEL_ID"),
    }
```

### Monitor Network Requests
- Use browser DevTools Network tab
- Check request/response payloads
- Look for failed requests

## Getting Help

1. Check the logs in both terminals (client and server)
2. Verify all environment variables are set correctly
3. Ensure you're using compatible versions of dependencies
4. Test with the provided sample files first
5. Try a different model if one isn't working

## Performance Optimization

If experiencing slow performance:
1. Resize large images before processing
2. Reduce model temperature for faster responses
3. Consider caching results for repeated images
4. Use a smaller model for simple documents