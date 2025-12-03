from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .config import get_settings
from .crud import ensure_curriculum_courses
from .database import init_db, engine
from .routers import admin, attendance, auth, face, student, teacher

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(teacher.router)
app.include_router(student.router)
app.include_router(attendance.router)
app.include_router(face.router)


@app.on_event("startup")
def on_startup():
    init_db()
    with Session(engine) as session:
        ensure_curriculum_courses(session)


@app.get("/health")
def health():
    return {"status": "ok"}


