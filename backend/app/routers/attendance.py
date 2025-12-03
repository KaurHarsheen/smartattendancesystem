from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import get_current_user, require_role
from ..crud import record_detection
from ..database import get_session
from ..face_service import best_match, deserialize_embeddings, extract_embedding, to_vector
from ..models import (
    AttendanceSession,
    Enrollment,
    RoleEnum,
    StudentProfile,
    TeacherProfile,
    User,
)
from ..schemas import (
    AttendanceDetectionPayload,
    AttendanceRecordResponse,
    FaceVerificationRequest,
    FaceVerificationResponse,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def _load_session(session: Session, session_id: int) -> AttendanceSession:
    attendance_session = session.get(AttendanceSession, session_id)
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Session not found")
    return attendance_session


def _validate_teacher_access(session: Session, attendance_session: AttendanceSession, current_user: User) -> None:
    if current_user.role == RoleEnum.ADMIN:
        return
    teacher_profile = session.exec(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)).first()
    if not teacher_profile or attendance_session.offering.teacher_id != teacher_profile.id:
        raise HTTPException(status_code=403, detail="Not authorized for this session")


@router.post("/{session_id}/detect", response_model=AttendanceRecordResponse)
def ingest_detection(
    session_id: int,
    payload: AttendanceDetectionPayload,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (RoleEnum.TEACHER, RoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Detection ingestion restricted")
    record = record_detection(session, session_id, payload.student_id, payload.confidence)
    return AttendanceRecordResponse(
        student_id=record.student.student_id,
        student_name=record.student.user.full_name,
        status=record.status,
        detected_at=record.detected_at,
        confidence=record.confidence,
    )


@router.post("/{session_id}/verify-face", response_model=FaceVerificationResponse)
def verify_face_attendance(
    session_id: int,
    payload: FaceVerificationRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (RoleEnum.TEACHER, RoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Face verification restricted")

    attendance_session = _load_session(session, session_id)
    _validate_teacher_access(session, attendance_session, current_user)

    try:
        if not payload.image_data:
            raise HTTPException(status_code=400, detail="Image data is required")
        if len(payload.image_data) < 100:
            raise HTTPException(status_code=400, detail="Image data appears to be too short or invalid")
        probe_vector = to_vector(extract_embedding(payload.image_data))
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(exc)}") from exc

    enrollments = session.exec(select(Enrollment).where(Enrollment.offering_id == attendance_session.offering_id)).all()
    candidates = []
    student_lookup: dict[int, StudentProfile] = {}
    embedding_lookup: dict[int, str] = {}  # Store the deserialized embedding used for matching
    for enrollment in enrollments:
        student = session.get(StudentProfile, enrollment.student_id)
        if not student:
            continue
        session.refresh(student, attribute_names=["user"])
        session.refresh(student.user, attribute_names=["face_embedding"])
        if not student.user.face_embedding or not student.user.face_embedding.vector:
            continue
        embeddings = deserialize_embeddings(student.user.face_embedding.vector)
        candidates.append((student.id, embeddings))
        student_lookup[student.id] = student
        embedding_lookup[student.id] = embeddings  # Store the deserialized embedding

    if not candidates:
        return FaceVerificationResponse(
            matched=False,
            message="No registered faces for this class yet.",
            confidence=None,
            probe_embedding=probe_vector,
            matched_embedding=None,
        )

    best_id, best_score = best_match(probe_vector, candidates)
    # Threshold for ArcFace embeddings (typically 0.4-0.6 works well)
    # Lower threshold for InsightFace/ArcFace, higher for basic methods
    threshold = 0.50  # Adjusted for better face recognition models
    matched_embedding = None
    if best_id:
        matched_embedding = embedding_lookup[best_id]  # Return the deserialized embedding that was matched
    
    if not best_id or best_score < threshold:
        return FaceVerificationResponse(
            matched=False,
            confidence=best_score,
            message="Face not recognized. Try again or enroll the student.",
            probe_embedding=probe_vector,
            matched_embedding=matched_embedding,
        )

    matched_student = student_lookup[best_id]
    record = record_detection(session, session_id, matched_student.student_id, round(best_score, 3))
    return FaceVerificationResponse(
        matched=True,
        student_id=matched_student.student_id,
        student_name=matched_student.user.full_name,
        confidence=best_score,
        message="Attendance logged via face verification.",
        probe_embedding=probe_vector,
        matched_embedding=matched_embedding,
    )

