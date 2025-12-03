## Overview

The computer-vision attendance platform is delivered as a two-tier project:

- `backend/`: FastAPI + SQLModel service exposing role-aware REST APIs, JWT auth, SQLite persistence, and a mocked face-recognition integration point.  
- `frontend/`: React + Vite + TypeScript web client delivering the Admin, Teacher, and Student dashboards as separate layout shells that interact with the backend via the REST API.

## Technology Stack

| Layer      | Choice                         | Notes |
|------------|--------------------------------|-------|
| Backend    | FastAPI, SQLModel, Uvicorn     | Async APIs, Pydantic validation, simple ORM/query layer on SQLite |
| Auth       | JWT (HS256), Passlib (bcrypt)  | Password hashing, role-based dependencies |
| Frontend   | React 18, Vite, TypeScript     | React Router for dashboard routing, Zustand for lightweight state |
| Styling    | Tailwind CSS                   | Utility-first for quick dashboards |
| Face Layer | OpenCV + face embeddings (mock) | Stubbed service to plug in real model later |
| DB         | SQLite (dev)                   | Single-file DB; replace with Postgres/MySQL in production |

## Key Modules

- `app/config.py`: Centralized settings (secrets, tokens, curriculum map).  
- `app/models.py`: SQLModel schemas covering users, roles, courses, sessions, records, face embeddings, and teacher course requests.  
- `app/crud.py`: Composable data-access helpers to keep endpoints slim.  
- `app/auth.py`: Password hashing, JWT issuance, dependency helpers for role enforcement.  
- `app/routers/`: Logical API routers grouped by role (`admin`, `teacher`, `student`, `auth`, `faces`, `attendance`).  
- `frontend/src/pages/*`: Page shells for each dashboard, each hitting the matching REST endpoints.  
- `frontend/src/api/client.ts`: Axios wrapper that injects auth tokens, handles refresh, and centralizes error handling.

## Data Model Snapshot

- `users`: Core identity table with role (`ADMIN`, `TEACHER`, `STUDENT`), hashed password, and `must_change_password` flag.  
- `teachers`, `students`: Profile extensions keyed to `users`.  
- `courses`: Canonical course definitions linked to branch + year.  
- `course_offerings`: Teacher-specific delivery of a course and term metadata.  
- `course_requests`: Tracks teacher requests awaiting admin approval.  
- `enrollments`: Connects students to offerings; auto-populated when (a) students join a branch/year with offerings or (b) offerings are created for an existing population.  
- `attendance_sessions`: Start/end windows for a class meeting.  
- `attendance_records`: Per-student presence within a session, storing detection metadata.  
- `face_embeddings`: References to stored vectors/images for recognition.
- `admin_logins`, `teacher_logins`, `student_logins`: Role-specific credential registries that mirror hashed passwords, store last-login stamps, and keep authentication scoped per persona.
- `credential_audit` (separate `credentials.db`): Testing-only table that stores plain-text passwords + role metadata to satisfy admin auditing requirements without touching the production attendance database.
- `reset_databases.py`: Helper script that removes both SQLite files so the environment can be reseeded from scratch.

## Attendance Pipeline

1. Teacher launches session (`/teacher/attendance/start`).  
2. Backend opens an `attendance_session` row and returns a session token for the edge device.  
3. Edge device (mocked via `/attendance/detect`) posts recognized student IDs while the session is active.  
4. Records are upserted per student; the total and present counters feed computed percentages.  
5. Teacher closes session (`/teacher/attendance/{id}/end`), locking edits unless admin override is invoked.

## Dashboard Responsibilities

- **Admin:** Manage teachers, students, course catalogs, branch/year mappings, course offerings, and credential resets. Provides snapshot metrics (user counts, attendance health).  
- **Teacher:** View assigned offerings, request new courses, manage attendance sessions, capture student faces, and review per-course attendance percentages.  
- **Student:** Review personal attendance summaries per course, inspect session history, and upload/update face data (pending approval).

## Credential Workflow

1. Admin registers teacher/student; system auto-generates IDs (`TCHRXXXX`, `STUDYYYYbranchNNN`).  
2. Default password = random 10-char slug emailed via SMTP (development: console log).  
3. `must_change_password` forces reset on first login through `/auth/change-password`.

## Face Module

- `face_service.py` now uses OpenCV (Haar cascades + normalized grayscale vectors) to generate embeddings and cosine similarity scores.  
- Students enroll via the webcam UI (`/faces/capture`), storing vectors in `face_embeddings`.  
- Teachers trigger `/attendance/{session_id}/verify-face`, which matches the captured frame against enrolled students and records attendance if the similarity clears the threshold; otherwise, the response flags "wrong person".

## Deployment Notes

- Development: `uvicorn app.main:app --reload` for backend, `npm run dev` for frontend.  
- Production: Build frontend assets, serve via CDN or static bucket, deploy backend with Gunicorn/Uvicorn workers behind reverse proxy, move SQLite to managed Postgres, and point face-service to actual hardware.  
- Run `alembic` (future enhancement) for migrations once schema stabilizes.

## Testing Strategy

- Backend: Pytest suites for CRUD, auth, enrollment propagation, attendance calculations, and role guards.  
- Frontend: React Testing Library for page-level smoke tests + Zustand store logic.  
- Integration: Notebook or Postman collection exercising end-to-end flows (registration → login → attendance session).


