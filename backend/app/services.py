import json
import re
import tempfile
from typing import List, Dict, Any
import base64
from gtts import gTTS
from moviepy import ImageClip, AudioFileClip, concatenate_videoclips # Use .editor
import os
from app import logger
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
from PIL import Image # <--- ADD THIS IMPORT

load_dotenv()


def generate_presentation_script(all_slides_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates scripts for an entire presentation in a single API call to Gemini.
    """
    logger.info(f"Generating script for {len(all_slides_data)} slides.")
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")

    simplified_data = []
    for slide in all_slides_data:
        content_description = []
        for element in slide['content']:
            if element['type'] == 'text':
                content_description.append(f"TEXT: {element['data']}")
            elif element['type'] == 'table':
                content_description.append(f"TABLE: {element['data']}")
            elif element['type'] == 'image':
                content_description.append("IMAGE: An image is present on this slide.")

        simplified_data.append({
            "slide_number": slide['slide_number'],
            "content": "\n".join(content_description),
            "notes": slide['notes']
        })

    prompt = f"""
    You are a professional presentation scriptwriter. I will provide content for a presentation with {len(simplified_data)} slides.
    Your task is to generate an engaging script for EVERY SINGLE SLIDE provided.
    Treat it as you're going to present it and don't wait for questions.
    IMPORTANT: Your response MUST be a single, valid JSON array containing exactly {len(simplified_data)} objects.
    Each object must have two keys: "slide_number" (integer) and "script" (string).
    Here is the presentation data:
    {json.dumps(simplified_data, indent=2)}
    """

    try:
        response = llm.invoke(prompt)
        
        json_match = re.search(r"```json\n(.*)\n```", response.content, re.DOTALL)
        if not json_match:
            try:
                parsed_response = json.loads(response.content)
            except json.JSONDecodeError:
                raise json.JSONDecodeError("No valid JSON found in the response", response.content, 0)
        else:
            json_string = json_match.group(1)
            parsed_response = json.loads(json_string)

        logger.info(f"Successfully generated script for {len(parsed_response)} slides.")
        return parsed_response
    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON from LLM response. Raw Response: {response.content}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred while calling the LLM: {e}")
        return None

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
    
    
    WIDTH, HEIGHT = 1920, 1080

    for i, slide in enumerate(slides_data):
        
        if i >= len(audio_files):
            continue

        temp_image_path = os.path.join(temp_dir, f"slide_{i+1}.png")
        image_data = None
        for element in slide['content']:
            if element['type'] == 'image':
                image_data = element['data']
                break

        if image_data:
            
            image_data = image_data.split(",")[1]
            with open(temp_image_path, "wb") as f:
                f.write(base64.b64decode(image_data))
        else:
           
            img = Image.new('RGB', (WIDTH, HEIGHT), color = '#242424')
            img.save(temp_image_path)
            
        temp_image_files.append(temp_image_path)

        
        img_clip = ImageClip(temp_image_path)
        audio_clip = AudioFileClip(audio_files[i])

        img_clip = img_clip. duration(audio_clip.duration)
        video_clip = img_clip.with_audio(audio_clip)

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