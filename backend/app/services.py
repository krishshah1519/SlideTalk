import json
from typing import List, Dict, Any
import base64
from gtts import gTTS
from moviepy import *
import os
from app import logger
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def generate_presentation_script(all_slides_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates scripts for an entire presentation in a single API call to Gemini.
    """
    logger.info(f"Generating script for {len(all_slides_data)} slides.")
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

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
        parsed_response = json.loads(response.content)
        print(f"Successfully generated script for {len(parsed_response)} slides.")
        logger.info(f"Successfully generated script for {len(parsed_response)} slides.")
        return parsed_response
    except json.JSONDecodeError:
        print(f"ERROR: Failed to decode JSON from LLM response. Raw Response: {response.content}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while calling the LLM: {e}")
        return None

def generate_audio_from_script(scripts: List[Dict[str, Any]]) -> List[str]:
    """
    Generates audio files from the presentation script.
    """
    audio_files = []
    for script in scripts:
        tts = gTTS(text=script['script'], lang='en')
        audio_file = f"slide_{script['slide_number']}.mp3"
        tts.save(audio_file)
        audio_files.append(audio_file)
    return audio_files

def create_video_from_presentation(slides_data: List[Dict[str, Any]], audio_files: List[str]) -> str:
    """
    Creates a video from the presentation slides and audio files.
    """
    clips = []
    for i, slide in enumerate(slides_data):
        image_data = None
        for element in slide['content']:
            if element['type'] == 'image':
                image_data = element['data']
                break

        if image_data:
            # Remove the "data:image/png;base64," part
            image_data = image_data.split(",")[1]
            with open(f"slide_{i+1}.png", "wb") as f:
                f.write(base64.b64decode(image_data))

            img_clip = ImageClip(f"slide_{i+1}.png").duration(10)
            audio_clip = AudioFileClip(audio_files[i])
            video_clip = img_clip.set_audio(audio_clip)
            clips.append(video_clip)

    final_clip = concatenate_videoclips(clips, method="compose")
    video_file = "presentation.mp4"
    final_clip.write_videofile(video_file, fps=24)

    for i in range(len(slides_data)):
        os.remove(f"slide_{i+1}.png")
        os.remove(audio_files[i])

    return video_file