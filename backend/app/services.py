def extract_base64_image(image_data: str) -> str:
    """
    Extracts the base64 string from a data URL.
    Args:
        image_data (str): Data URL string (e.g., 'data:image/png;base64,...').
    Returns:
        str: Base64-encoded image string.
    """
    try:
        return image_data.split(",", 1)[1]
    except Exception as e:
        logger.error(f"Failed to extract base64 image: {e}")
        return ""
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

from . import logger
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


def generate_presentation_script(all_slides_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates scripts for an entire presentation by analyzing the slide images and notes.
    Args:
        all_slides_data (List[Dict[str, Any]]): List of slide data dicts, each containing slide_number, notes, and content.
    Returns:
        List[Dict[str, Any]]: List of script dicts for each slide, with slide_number and script.
    """
    logger.info(f"Generating script for {len(all_slides_data)} slides.")
    # Validate input slides
    valid_slides = []
    for idx, slide in enumerate(all_slides_data):
        if not isinstance(slide, dict):
            logger.error(f"Slide at index {idx} is not a dict: {slide}")
            continue
        if 'slide_number' not in slide or 'content' not in slide:
            logger.error(f"Slide missing required keys at index {idx}: {slide}")
            continue
        if not slide['content'] or not isinstance(slide['content'], list) or 'data' not in slide['content'][0]:
            logger.error(f"Slide content malformed at index {idx}: {slide}")
            continue
        valid_slides.append(slide)
    if not valid_slides:
        logger.error("No valid slides to process.")
        return []
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
        if not isinstance(parsed_response, list):
            logger.error(f"Parsed response is not a list. Parsed: {parsed_response}")
            return []
        logger.info(f"Successfully generated script for {len(parsed_response)} slides.")
        return parsed_response
    except json.JSONDecodeError as jde:
        logger.error(f"Failed to decode JSON from LLM response. Raw Response: {response.content}. Error: {jde}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error in generate_presentation_script: {e}", exc_info=True)
        return []

def _generate_single_audio(script_item: Dict[str, Any], temp_dir: str) -> str:
    """
    Helper function to generate a single audio file from a script item.
    Args:
        script_item (Dict[str, Any]): The script dict for a slide, containing 'script' and 'slide_number'.
        temp_dir (str): Path to temporary directory for audio files.
    Returns:
        str: Path to the generated audio file, or empty string on failure.
    """
    try:
        if not script_item.get('script'):
            logger.error(f"Missing script for slide {script_item.get('slide_number', 'unknown')}")
            return ""
        if 'slide_number' not in script_item:
            logger.error(f"Missing slide_number in script_item: {script_item}")
            return ""
        tts = gTTS(text=script_item['script'], lang='en')
        audio_file = os.path.join(temp_dir, f"slide_{script_item['slide_number']}.mp3")
        tts.save(audio_file)
        logger.info(f"Audio generated for slide {script_item['slide_number']}: {audio_file}")
        return audio_file
    except Exception as e:
        logger.error(f"Failed to generate audio for slide {script_item.get('slide_number', 'unknown')}: {e}", exc_info=True)
        return ""


def generate_audio_from_script(scripts: List[Dict[str, Any]], temp_dir: str) -> List[str]:
    """
    Generates audio files for all scripts using a thread pool.
    Args:
        scripts (List[Dict[str, Any]]): List of script dicts for each slide.
        temp_dir (str): Path to temporary directory for audio files.
    Returns:
        List[str]: List of paths to generated audio files.
    """
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
    """
    Creates a video from slide images and audio files.
    Args:
        slides_data (List[Dict[str, Any]]): List of slide data dicts.
        audio_files (List[str]): List of audio file paths.
        temp_dir (str): Path to temporary directory for video file.
    Returns:
        str: Path to the generated video file.
    Raises:
        ValueError: If no clips are created (e.g., missing images or audio).
    """
    clips = []
    temp_image_files = []
    
    for i, slide in enumerate(slides_data):
        try:
            if i >= len(audio_files) or not slide.get('content'):
                logger.warning(f"Skipping slide {i+1}: missing audio or content.")
                continue
            if not isinstance(slide['content'], list) or not slide['content']:
                logger.warning(f"Slide {i+1} content is not a valid list.")
                continue
            image_element = slide['content'][0]
            if image_element.get('type') == 'image' and 'data' in image_element:
                temp_image_path = os.path.join(temp_dir, f"slide_{i+1}.png")
                image_data = image_element['data']
                base64_image = extract_base64_image(image_data)
                with open(temp_image_path, "wb") as f:
                    f.write(base64.b64decode(base64_image))
                temp_image_files.append(temp_image_path)
                with ImageClip(temp_image_path) as img_clip, AudioFileClip(audio_files[i]) as audio_clip:
                    img_clip = img_clip.with_duration(audio_clip.duration)
                    video_clip = img_clip.with_audio(audio_clip)
                    clips.append(video_clip)
            else:
                logger.warning(f"Slide {i+1} does not contain a valid image element.")
        except Exception as e:
            logger.error(f"Error processing slide {i+1}: {e}", exc_info=True)

    if not clips:
        logger.error("No clips were created. Check if images and audio files are being generated correctly.")
        raise ValueError("No clips were created. Check if images and audio files are being generated correctly.")

    try:
        with concatenate_videoclips(clips, method="compose") as final_clip:
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
        for img_file in temp_image_files:
            if os.path.exists(img_file):
                os.remove(img_file)
    return video_file