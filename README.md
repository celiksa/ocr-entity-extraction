# AI Document OCR & Entity Extraction

A modern web application that performs OCR (Optical Character Recognition) on documents and extracts structured entities using advanced AI models. The app features a React frontend with a beautiful UI and a FastAPI backend.

## Features

- **Dual Input Methods**: Select from pre-loaded sample images or upload your own
- **Modern UI**: Beautiful, responsive interface with smooth animations
- **Structured Data Extraction**: Extracts not just text but organized information
- **Real-time Processing**: Get instant OCR results powered by watsonx.ai
- **Document Intelligence**: Automatically identifies document types and key information

## Prerequisites

- Python 3.8+
- Node.js 16+
- IBM watsonx.ai account with API credentials
- Project ID from IBM watsonx.ai

## Setup Instructions

### 1. Clone the Repository
```bash
cd ocr-app
```

### 2. Backend Setup

Navigate to the server directory:
```bash
cd server
```

Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your IBM watsonx.ai credentials and model configuration:
```
WATSONX_API_KEY=your_api_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Model Configuration
WATSONX_MODEL_ID=mistralai/mistral-medium-2505
WATSONX_MAX_NEW_TOKENS=2000
WATSONX_TEMPERATURE=0.5
WATSONX_TOP_P=0.95
```

### 3. Frontend Setup

Open a new terminal and navigate to the client directory:
```bash
cd client
```

Install dependencies:
```bash
npm install
```

### 4. Running the Application

Start the backend server:
```bash
# In the server directory
python app.py
```
The API will be available at http://localhost:8000

Start the frontend development server:
```bash
# In the client directory
npm start
```
The application will open at http://localhost:3000

## Usage

1. **Sample Images**: Click on the "Sample Images" tab to see pre-loaded documents. Click any sample to process it.

2. **Upload Image**: Switch to the "Upload Image" tab to drag and drop or select your own image files.

3. **View Results**: After processing, you'll see:
   - Document type identification
   - Extracted raw text
   - Structured data (if applicable)
   - Special elements detected
   - Processing confidence level

## API Endpoints

- `GET /api/samples` - List available sample images
- `POST /api/ocr/sample/{filename}` - Process a sample image
- `POST /api/ocr/upload` - Process an uploaded image
- `GET /api/health` - Health check endpoint

## Supported File Formats

- PNG
- JPG/JPEG
- GIF
- BMP

## Technology Stack

- **Frontend**: React, TypeScript, Framer Motion, Axios
- **Backend**: FastAPI, Python
- **AI Integration**: Advanced multimodal AI models

## Project Structure

```
ocr-app/
├── client/               # React frontend
│   ├── src/
│   │   ├── App.tsx      # Main application component
│   │   └── App.css      # Application styles
│   └── package.json
├── server/              # FastAPI backend
│   ├── app.py          # Main server application
│   ├── requirements.txt
│   └── .env.example
├── samples/             # Sample documents for testing
└── README.md
```

## Troubleshooting

1. **API Key Issues**: Ensure your watsonx.ai API key is valid and has the necessary permissions
2. **CORS Errors**: Make sure both frontend and backend are running on the specified ports
3. **Image Processing Errors**: Check that the image format is supported and file size is reasonable

## License

This project is provided as-is for demonstration purposes.