import io
import os
import tempfile
import base64
from typing import List, Dict, Any
import win32com.client
import pythoncom

def extract_content_from_ppt(ppt_file: io.BytesIO) -> List[Dict[str, Any]]:
    """
    Converts each slide of a PPTX file into a base64 encoded image using the PowerPoint application itself.
    This provides the highest fidelity conversion. Requires pywin32.
    """
    # Initialize the COM library for the current thread
    pythoncom.CoInitialize()
    
    slides_content = []
    
    # Use a temporary directory to handle file operations
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_ppt_path = os.path.join(temp_dir, "presentation.pptx")
        
        # Write the in-memory file to a temporary file on disk
        with open(temp_ppt_path, "wb") as f:
            f.write(ppt_file.getvalue())

        # Create a PowerPoint application object
        powerpoint = win32com.client.Dispatch("PowerPoint.Application")
        
        # Open the presentation
        presentation = powerpoint.Presentations.Open(temp_ppt_path, WithWindow=False)
        
        # Get the notes for each slide
        notes_list = []
        for i in range(1, len(presentation.Slides) + 1):
            slide = presentation.Slides(i)
            notes = ""
            if slide.HasNotesPage and slide.NotesPage.Shapes.Placeholders(2).TextFrame.HasText:
                notes = slide.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text
            notes_list.append(notes)

        # Export each slide as a high-quality PNG
        for i in range(1, len(presentation.Slides) + 1):
            image_path = os.path.join(temp_dir, f"slide_{i}.png")
            presentation.Slides(i).Export(image_path, "PNG")
            
            # Read the exported image and encode it in base64
            with open(image_path, "rb") as image_file:
                img_str = base64.b64encode(image_file.read()).decode("utf-8")
            
            slide_data = {
                "slide_number": i,
                "content": [{"type": "image", "data": f"data:image/png;base64,{img_str}"}],
                "notes": notes_list[i-1]
            }
            slides_content.append(slide_data)
        
        
        presentation.Close()
        powerpoint.Quit()

    
    pythoncom.CoUninitialize()

    return slides_content