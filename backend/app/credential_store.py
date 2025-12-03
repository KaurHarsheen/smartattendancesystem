from datetime import datetime
from pathlib import Path
import sqlite3

from .config import get_settings

settings = get_settings()

DB_PATH = settings.credentials_database_url.replace("sqlite:///", "", 1)
parent_dir = Path(DB_PATH).parent
if str(parent_dir) not in ("", "."):
    parent_dir.mkdir(parents=True, exist_ok=True)


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS credential_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL,
            plain_password TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    return conn


def record_credentials(email: str, role: str, full_name: str, plain_password: str) -> None:
    timestamp = datetime.utcnow().isoformat()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO credential_audit (email, role, full_name, plain_password, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                role=excluded.role,
                full_name=excluded.full_name,
                plain_password=excluded.plain_password,
                updated_at=excluded.updated_at
            """,
            (email, role, full_name, plain_password, timestamp),
        )
        conn.commit()



