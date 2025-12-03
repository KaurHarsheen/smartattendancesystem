from functools import lru_cache
from typing import Dict, List, Tuple

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "UCS503 Attendance Platform"
    secret_key: str = Field("super-secret-key-change-me", env="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12  # 12 hours
    database_url: str = Field("sqlite:///./attendance.db", env="DATABASE_URL")
    credentials_database_url: str = Field("sqlite:///./credentials.db", env="CREDENTIALS_DATABASE_URL")
    default_password_length: int = 10
    curriculum_map: Dict[Tuple[str, int], List[str]] = {
        ("COE", 3): [
            "Computer Networks",
            "Image Processing",
            "Data Structures & Algorithms",
        ],
        ("COE", 2): [
            "Operating Systems",
            "Signals & Systems",
            "Probability & Statistics",
        ],
        ("ECE", 3): [
            "Digital Signal Processing",
            "Embedded Systems",
            "Wireless Communication",
        ],
    }

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


