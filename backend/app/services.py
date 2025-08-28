import json
from typing import List, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def generate_presentation_script(all_slides_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates scripts for an entire presentation in a single API call to Gemini.
    """

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite")

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
    IMPORTANT: Your response MUST be a single, valid JSON array containing exactly {len(simplified_data)} objects.
    Each object must have two keys: "slide_number" (integer) and "script" (string).
    Here is the presentation data:
    {json.dumps(simplified_data, indent=2)}
    """

    try:
        response = llm.invoke(prompt)
        parsed_response = json.loads(response.content)
        print(f"Successfully generated script for {len(parsed_response)} slides.")
        return parsed_response
    except json.JSONDecodeError:
        print(f"ERROR: Failed to decode JSON from LLM response. Raw Response: {response.content}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while calling the LLM: {e}")
        return None