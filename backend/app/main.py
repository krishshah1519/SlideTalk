
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.ppt_parser import extract_content_from_ppt
from app.services import generate_presentation_script

load_dotenv()

app = FastAPI(title="Presentation API")

origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """
    Verify's connection is working and serves as a welcome message
    """
    return {"message": "Welcome to the Presentation API!"}

@app.post("/create-presentation/")
async def process_presentation_endpoint(file: UploadFile = File(...)):
    """
    Extract content from the presentation
    Generate script for the entire presentation
    Return the successful response
    """
    if not file.filename.endswith('.pptx'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .pptx file.")

    try:
        ppt_stream = io.BytesIO(await file.read())


        extracted_data = extract_content_from_ppt(ppt_stream)
        if not extracted_data:
            raise HTTPException(status_code=500, detail="Failed to extract any content from the presentation.")


        scripts = generate_presentation_script(extracted_data)
        if not scripts:
            raise HTTPException(status_code=500, detail="Failed to generate scripts from the language model.")


        return {
            "filename": file.filename,
            "slide_count": len(extracted_data),
            "scripts": scripts
        }
    except Exception as e:
        print(f"An error occurred in the endpoint: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")