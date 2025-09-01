import base64
import io
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List

from dotenv import load_dotenv
from gtts import gTTS
from moviepy import (AudioFileClip, ImageClip,
                            concatenate_videoclips)
from PIL import Image

from app import logger
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


def generate_presentation_script(all_slides_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates scripts for an entire presentation by analyzing the slide images and notes.
    """
    logger.info(f"Generating script for {len(all_slides_data)} slides.")
    # Use a multimodal model capable of understanding both text and images
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")

    messages = []
    prompt = f"""
    You are a professional presentation scriptwriter. I will provide a series of slides, each with an image and optional presenter notes.
    Your task is to generate an engaging and descriptive script for EACH slide.
    - Analyze the image to understand the visual content (charts, diagrams, keywords).
    - Use the presenter notes for additional context and key points.
    - Create a script that a presenter would naturally say for that slide.

    IMPORTANT: Your response MUST be a single, valid JSON array, with one object per slide.
    Each object must have two keys: "slide_number" (integer) and "script" (string).
    """
    messages.append({"role": "user", "content": prompt})

    for slide in all_slides_data:
        slide_number = slide['slide_number']
        notes = slide['notes']
        image_data = slide['content'][0]['data']
        base64_image = image_data.split(",")[1]

        message_content = [
            {"type": "text", "text": f"--- Slide {slide_number} ---\nPresenter Notes: {notes if notes else 'N/A'}"},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
        ]
        messages.append({"role": "user", "content": message_content})

    try:
        response = llm.invoke(messages)
        
        json_match = re.search(r"```json\n(.*)\n```", response.content, re.DOTALL)
        if not json_match:
            parsed_response = json.loads(response.content)
        else:
            json_string = json_match.group(1)
            parsed_response = json.loads(json_string)

        logger.info(f"Successfully generated script for {len(parsed_response)} slides.")
        return parsed_response
    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON from LLM response. Raw Response: {response.content}")
        return []
    except Exception as e:
        logger.error(f"An unexpected error occurred while calling the LLM: {e}")
        return []

def _generate_single_audio(script_item: Dict[str, Any], temp_dir: str) -> str:
    """Helper function to generate a single audio file."""
    try:
        tts = gTTS(text=script_item['script'], lang='en')
        audio_file = os.path.join(temp_dir, f"slide_{script_item['slide_number']}.mp3")
        tts.save(audio_file)
        return audio_file
    except Exception as e:
        logger.error(f"Failed to generate audio for slide {script_item.get('slide_number', 'unknown')}: {e}")
        return ""


def generate_audio_from_script(scripts: List[Dict[str, Any]], temp_dir: str) -> List[str]:
    """
    Generates audio files in parallel using a thread pool.
    """
    with ThreadPoolExecutor() as executor:
        
        futures = [executor.submit(_generate_single_audio, script, temp_dir) for script in scripts]
        
        audio_files = [future.result() for future in futures]
    
    
    return [f for f in audio_files if f]


def create_video_from_presentation(slides_data: List[Dict[str, Any]], audio_files: List[str], temp_dir: str) -> str:
    clips = []
    temp_image_files = []
    
    for i, slide in enumerate(slides_data):
        if i >= len(audio_files) or not slide['content']:
            continue

        temp_image_path = os.path.join(temp_dir, f"slide_{i+1}.png")
        
        image_element = slide['content'][0]
        if image_element['type'] == 'image':
            image_data = image_element['data'].split(",")[1]
            with open(temp_image_path, "wb") as f:
                f.write(base64.b64decode(image_data))
            temp_image_files.append(temp_image_path)

            img_clip = ImageClip(temp_image_path)
            audio_clip = AudioFileClip(audio_files[i])

            img_clip = img_clip.set_duration(audio_clip.duration)
            video_clip = img_clip.set_audio(audio_clip)
            clips.append(video_clip)

    if not clips:
        raise ValueError("No clips were created. Check if images and audio files are being generated correctly.")

    final_clip = concatenate_videoclips(clips, method="compose")
    video_file = os.path.join(temp_dir, "presentation.mp4")

    
    final_clip.write_videofile(
        video_file,
        fps=24,
        codec="libx264",
        preset="ultrafast", 
        threads=4
    )

    
    final_clip.close()
    for clip in clips:
        if clip.audio:
            clip.audio.close()
        clip.close()
    
    
    for img_file in temp_image_files:
        if os.path.exists(img_file):
            os.remove(img_file)

    return video_file