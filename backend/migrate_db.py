import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "attendance.db"

def migrate():
    if not DB_PATH.exists():
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(attendancesession)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "session_number" not in columns:
            print("Adding session_number column...")
            cursor.execute("ALTER TABLE attendancesession ADD COLUMN session_number INTEGER DEFAULT 1 NOT NULL")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column session_number already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
