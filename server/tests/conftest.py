"""Pytest configuration for the server test suite.

Sets dummy environment variables so that pydantic-settings does not raise
ValidationError during import. Tests in this suite only call pure math
functions — no Supabase or Gemini connections are made.
"""

import os

# Set dummy credentials before any service module is imported.
# The actual values are irrelevant because no network calls are made in tests.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
