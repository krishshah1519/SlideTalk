import io
import os
import tempfile
import base64
from typing import List, Dict, Any
import win32com.client
import pythoncom
from . import logger
import time
import gc
import shutil

def extract_content_from_ppt(ppt_file: io.BytesIO) -> List[Dict[str, Any]]:
    """
    Converts each slide of a PPTX file into a base64 encoded image using the PowerPoint application itself.
    This provides the highest fidelity conversion. Requires pywin32.
    """
    pythoncom.CoInitialize()
    slides_content = []
    powerpoint = None
    presentation = None
    temp_dir = tempfile.mkdtemp()
    
    try:
        temp_ppt_path = os.path.join(temp_dir, "presentation.pptx")
        
        with open(temp_ppt_path, "wb") as f:
            f.write(ppt_file.getvalue())

        powerpoint = win32com.client.Dispatch("PowerPoint.Application")
        presentation = powerpoint.Presentations.Open(temp_ppt_path, WithWindow=False)
        
        notes_list = []
        for i in range(1, len(presentation.Slides) + 1):
            slide = presentation.Slides(i)
            notes = ""
            if slide.HasNotesPage and slide.NotesPage.Shapes.Placeholders(2).TextFrame.HasText:
                notes = slide.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text
            notes_list.append(notes)

        for i in range(1, len(presentation.Slides) + 1):
            image_path = os.path.join(temp_dir, f"slide_{i}.png")
            presentation.Slides(i).Export(image_path, "PNG")
            
            with open(image_path, "rb") as image_file:
                img_str = base64.b64encode(image_file.read()).decode("utf-8")
            
            slide_data = {
                "slide_number": i,
                "content": [{"type": "image", "data": f"data:image/png;base64,{img_str}"}],
                "notes": notes_list[i-1]
            }
            slides_content.append(slide_data)
    
    except Exception as e:
        logger.error(f"An error occurred during PPT parsing: {e}", exc_info=True)
        return []
    finally:
        if presentation:
            presentation.Close()
        if powerpoint:
            powerpoint.Quit()
        
        del presentation
        del powerpoint
        gc.collect()

        time.sleep(1)

        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            logger.error(f"Error cleaning up temporary directory {temp_dir}: {e}")

        pythoncom.CoUninitialize()

    return slides_content