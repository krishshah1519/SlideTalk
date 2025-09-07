import io
import os
import tempfile
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from starlette.responses import FileResponse
from app import logger
from app.ppt_parser import extract_content_from_ppt
from app.services import generate_presentation_script, generate_audio_from_script
from pydantic import BaseModel, Field
from typing import List, Any

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

class AskQuestionRequest(BaseModel):
    presentation_id: str
    question: str = ""
    context: List[Any]

@app.post("/presentation/ask")
async def ask_question_endpoint(request: AskQuestionRequest):
    if not request.presentation_id:
        raise HTTPException(status_code=400, detail="Missing presentation_id.")
    
    if  not request.context:
        raise HTTPException(status_code=400, detail="Missing context.")

    if not request.question:
        return {"answer": "No question detected, moving to the next slide.", "action": "next_slide"}

    prompt = "You are an expert assistant for presentations. Here is the context from the slides and scripts so far."
    for slide in request.context:
        prompt += f"\nSlide {slide.get('slide_number')}: {slide.get('script', '')}"
    
    prompt += f"\nQuestion: {request.question}"

    try:
        from app.llm import llm
        response = llm.invoke([{"role": "user", "content": prompt}])
        answer = response.content.strip()
    except Exception as e:
        logger.error(f"Error in LLM question answering: {e}")
        answer = "Sorry, I could not process your question."

    return {"answer": answer, "action": "wait"} # Wait for user interaction.

presentation_data_store = {}

def cleanup_presentation_data(temp_dir: str, presentation_id: str = None):
    """A helper function to remove the temporary directory and optionally presentation data."""
    try:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            logger.info(f"Successfully cleaned up temporary directory: {temp_dir}")
        if presentation_id and presentation_id in presentation_data_store:
            del presentation_data_store[presentation_id]
            logger.info(f"Successfully cleaned up presentation data for ID: {presentation_id}")
    except Exception as e:
        logger.error(f"Error during cleanup for temp_dir {temp_dir}: {e}")

@app.post("/create-presentation/")
async def process_presentation_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith('.pptx'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .pptx file.")

    temp_dir = tempfile.mkdtemp()
    try:
        ppt_stream = io.BytesIO(await file.read())
        extracted_data = extract_content_from_ppt(ppt_stream)
        if not extracted_data:
            raise HTTPException(status_code=500, detail="Failed to extract content from the presentation.")

        scripts = generate_presentation_script(extracted_data)
        if not scripts:
            raise HTTPException(status_code=500, detail="Failed to generate scripts.")
        
        audio_files = generate_audio_from_script(scripts, temp_dir)
        
        presentation_id = str(uuid.uuid4())

        presentation_data_store[presentation_id] = {
            "slides": extracted_data,
            "audio_files": [os.path.abspath(f) for f in audio_files if f and os.path.exists(f)],
            "temp_dir": temp_dir
        }

        return {
            "presentation_id": presentation_id,
            "filename": file.filename,
            "slides": extracted_data,
            "scripts": scripts,
            "audio_files": [os.path.basename(f) for f in audio_files if f and os.path.exists(f)],
        }
    except Exception as e:
        logger.error(f"An error occurred during presentation creation: {e}", exc_info=True)
        # This call now works correctly because presentation_id is not required
        cleanup_presentation_data(temp_dir)
        raise HTTPException(status_code=500, detail="An internal server error occurred during presentation creation.")

@app.get("/presentation/{presentation_id}/audio/{audio_filename}")
async def get_presentation_audio(presentation_id: str, audio_filename: str):
    if presentation_id not in presentation_data_store:
        raise HTTPException(status_code=404, detail="Presentation not found.")

    data = presentation_data_store[presentation_id]
    temp_dir = data["temp_dir"]
    audio_file_path = os.path.join(temp_dir, audio_filename)

    if not os.path.exists(audio_file_path):
        raise HTTPException(status_code=404, detail="Audio file not found.")

    return FileResponse(audio_file_path, media_type="audio/mpeg")


def cleanup_temp_dir(temp_dir: str, presentation_id: str):
    """A helper function to remove the temporary directory and presentation data."""
    try:
        shutil.rmtree(temp_dir)
        logger.info(f"Successfully cleaned up temporary directory: {temp_dir}")
        if presentation_id in presentation_data_store:
            del presentation_data_store[presentation_id]
            logger.info(f"Successfully cleaned up presentation data for ID: {presentation_id}")
    except Exception as e:
        logger.error(f"Error cleaning up temporary directory {temp_dir}: {e}")

