from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def get_llm():
    """Initializes and returns the ChatGoogleGenerativeAI model."""
    return ChatGoogleGenerativeAI(model="gemini-2.0-flash")

llm = get_llm()