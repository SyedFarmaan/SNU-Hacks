from google import genai
from google.genai import types
from core.config import settings

_client: genai.Client | None = None

# Layer 1: document OCR/parsing — Flash is fast and cheap for structured extraction
FLASH_MODEL = "gemini-1.5-flash"

# Layer 4: chain-of-thought reasoning and email drafting — Pro for quality output
PRO_MODEL = "gemini-1.5-pro"


def get_client() -> genai.Client:
    """Return the singleton Gemini client (API key configured once)."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client
