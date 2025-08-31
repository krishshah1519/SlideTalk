import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from starlette.responses import FileResponse
from app import logger
from app.ppt_parser import extract_content_from_ppt
from app.services import generate_presentation_script, generate_audio_from_script, create_video_from_presentation

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


presentation_data_store = {}

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


        audio_files = generate_audio_from_script(scripts)


        presentation_id = "some_unique_id"
        presentation_data_store[presentation_id] = {
            "slides": extracted_data,
            "scripts": scripts,
            "audio_files": audio_files,
        }

        return {
            "presentation_id": presentation_id,
            "filename": file.filename,
            "slide_count": len(extracted_data),
            "slides": extracted_data,
            "scripts": scripts,
            "audio_files": audio_files,
        }
    except Exception as e:
        print(f"An error occurred in the endpoint: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

@app.get("/presentation/{presentation_id}/video")
async def get_presentation_video(presentation_id: str):
    """
    Generates and returns the video of the presentation.
    """
    if presentation_id not in presentation_data_store:
        raise HTTPException(status_code=404, detail="Presentation not found.")

    data = presentation_data_store[presentation_id]
    video_file = create_video_from_presentation(data["slides"], data["audio_files"])

    return FileResponse(video_file, media_type="video/mp4", filename="presentation.mp4")