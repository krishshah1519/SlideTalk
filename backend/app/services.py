import base64
import io
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List
import numpy as np
from dotenv import load_dotenv
from gtts import gTTS
from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
from PIL import Image
from pydantic import BaseModel, Field
from . import logger
from .llm import llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser


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
    valid_slides = [
        slide for slide in all_slides_data
        if isinstance(slide, dict) and 'slide_number' in slide and 'content' in slide and slide['content'] and 'data' in slide['content'][0]
    ]

    if not valid_slides:
        logger.error("No valid slides to process.")
        return []

    scripts = []
    parser = JsonOutputParser(pydantic_object=ScriptItem)

    for slide in valid_slides:
        try:
            slide_number = slide['slide_number']
            notes = slide.get('notes', '')
            image_data = slide['content'][0]['data']
            base64_image = extract_base64_image(image_data)

            message_content = [
                {"type": "text", "text": f"--- Slide {slide_number} ---\nPresenter Notes: {notes if notes else 'N/A'}"},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
            ]

            prompt = ChatPromptTemplate.from_messages([
                ("system", """
                    You are a professional presentation scriptwriter. Your task is to generate an engaging and descriptive script for ONE slide based on its image and presenter notes.
                    IMPORTANT: Your response MUST be a single, valid JSON object with two keys: "slide_number" (integer) and "script" (string).
                """),
                ("user", message_content)
            ])

            chain = prompt | llm | parser
            response = chain.invoke({})
            scripts.append(response)

            logger.info(f"Successfully generated script for slide {slide_number}")
            # time.sleep(2)  

        except Exception as e:
            logger.error(f"Failed to generate script for slide {slide.get('slide_number', 'unknown')}: {e}", exc_info=True)
            return []

    logger.info(f"Successfully generated scripts for {len(scripts)} slides.")
    return scripts

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