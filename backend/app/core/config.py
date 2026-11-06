import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Locate and load backend .env file regardless of current working directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(backend_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusFlow AI Backend"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    
    # Database Configuration (Environment variable driven)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./campusflow.db"
    )

    # Supabase Auth Configuration (Driven by Environment Variables)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://your-supabase-project.supabase.co")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "your-supabase-jwt-secret")

    # Gemini AI API Key (Driven by Environment Variables - NEVER hardcoded)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        env_file = env_path
        extra = "ignore"

settings = Settings()
