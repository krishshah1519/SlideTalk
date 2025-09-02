import base64
import io
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List

from dotenv import load_dotenv
from gtts import gTTS
from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
from PIL import Image
from pydantic import BaseModel, Field

from . import logger
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

class ScriptItem(BaseModel):
    slide_number: int
    script: str

def extract_base64_image(image_data: str) -> str:
    try:
        return image_data.split(",", 1)[1]
    except Exception as e:
        logger.error(f"Failed to extract base64 image: {e}")
        return ""

def generate_presentation_script(all_slides_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    logger.info(f"Generating script for {len(all_slides_data)} slides.")
    valid_slides = []
    for idx, slide in enumerate(all_slides_data):
        if not isinstance(slide, dict) or 'slide_number' not in slide or 'content' not in slide or not slide['content'] or 'data' not in slide['content'][0]:
            logger.error(f"Slide at index {idx} is not a valid slide: {slide}")
            continue
        valid_slides.append(slide)
    
    if not valid_slides:
        logger.error("No valid slides to process.")
        return []

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
    
    messages = [
        {
            "role": "user",
            "content": """
            You are a professional presentation scriptwriter. I will provide a series of slides, each with an image and optional presenter notes.
            Your task is to generate an engaging and descriptive script for EACH slide.
            - Analyze the image to understand the visual content (charts, diagrams, keywords).
            - Use the presenter notes for additional context and key points.
            - Create a script that a presenter would naturally say for that slide.

            IMPORTANT: Your response MUST be a single, valid JSON array, with one object per slide.
            Each object must have two keys: "slide_number" (integer) and "script" (string).
            """
        }
    ]

    for slide in valid_slides:
        slide_number = slide['slide_number']
        notes = slide.get('notes', '')
        image_data = slide['content'][0]['data']
        base64_image = extract_base64_image(image_data)
        message_content = [
            {"type": "text", "text": f"--- Slide {slide_number} ---\nPresenter Notes: {notes if notes else 'N/A'}"},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
        ]
        messages.append({"role": "user", "content": message_content})

    try:
        response = llm.invoke(messages)
        logger.debug(f"LLM raw response: {response.content}")
        
        json_match = re.search(r"```json\n(.*)\n```", response.content, re.DOTALL)
        if not json_match:
            parsed_response = json.loads(response.content)
        else:
            json_string = json_match.group(1)
            parsed_response = json.loads(json_string)

        scripts = [ScriptItem.model_validate(item).model_dump() for item in parsed_response]
        logger.info(f"Successfully generated script for {len(scripts)} slides.")
        return scripts
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to decode or validate JSON from LLM response. Raw Response: {response.content}. Error: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error in generate_presentation_script: {e}", exc_info=True)
        return []

def _generate_single_audio(script_item: Dict[str, Any], temp_dir: str) -> str:
    try:
        script = ScriptItem.model_validate(script_item)
        if not script.script:
            logger.error(f"Missing script for slide {script.slide_number}")
            return ""
        
        tts = gTTS(text=script.script, lang='en')
        audio_file = os.path.join(temp_dir, f"slide_{script.slide_number}.mp3")
        tts.save(audio_file)
        logger.info(f"Audio generated for slide {script.slide_number}: {audio_file}")
        return audio_file
    except Exception as e:
        logger.error(f"Failed to generate audio for slide {script_item.get('slide_number', 'unknown')}: {e}", exc_info=True)
        return ""

def generate_audio_from_script(scripts: List[Dict[str, Any]], temp_dir: str) -> List[str]:
    try:
        max_workers = min(8, os.cpu_count() or 4)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(_generate_single_audio, script, temp_dir) for script in scripts]
            audio_files = [future.result() for future in futures]
        valid_audio_files = [f for f in audio_files if f]
        logger.info(f"Generated {len(valid_audio_files)} audio files out of {len(scripts)} scripts using {max_workers} threads.")
        return valid_audio_files
    except Exception as e:
        logger.error(f"Error in generate_audio_from_script: {e}", exc_info=True)
        return []


def create_video_from_presentation(slides_data: List[Dict[str, Any]], audio_files: List[str], temp_dir: str) -> str:
    clips = []
    
    for i, slide in enumerate(slides_data):
        try:
            if i >= len(audio_files) or not slide.get('content') or not isinstance(slide['content'], list) or not slide['content'][0].get('type') == 'image':
                logger.warning(f"Skipping slide {i+1}: missing audio or valid image content.")
                continue

            image_data = slide['content'][0]['data']
            base64_image = extract_base64_image(image_data)
            image_bytes = base64.b64decode(base64_image)
            
            with Image.open(io.BytesIO(image_bytes)) as img:
                img_clip = ImageClip(img.copy())

            with AudioFileClip(audio_files[i]) as audio_clip:
                img_clip = img_clip.with_duration(audio_clip.duration)
                video_clip = img_clip.with_audio(audio_clip)
                clips.append(video_clip)

        except Exception as e:
            logger.error(f"Error processing slide {i+1}: {e}", exc_info=True)

    if not clips:
        logger.error("No clips were created. Check if images and audio files are being generated correctly.")
        raise ValueError("No clips were created.")

    try:
        final_clip = concatenate_videoclips(clips, method="compose")
        video_file = os.path.join(temp_dir, "presentation.mp4")
        final_clip.write_videofile(
            video_file,
            fps=24,
            codec="libx264",
            preset="ultrafast", 
            threads=4
        )
        logger.info(f"Video file created: {video_file}")
    except Exception as e:
        logger.error(f"Error during video creation: {e}", exc_info=True)
        raise
    finally:
        for clip in clips:
            clip.close()
        if 'final_clip' in locals():
            final_clip.close()

    return video_file