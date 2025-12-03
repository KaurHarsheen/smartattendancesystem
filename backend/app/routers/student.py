from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import get_current_user, require_role
from ..crud import summarize_attendance
from ..database import get_session
from ..models import AttendanceRecord, AttendanceSession, Enrollment, RoleEnum, StudentProfile, User
from ..schemas import AttendanceRecordResponse, AttendanceSummaryItem, EnrolledCourseResponse

router = APIRouter(
    prefix="/student",
    tags=["Student"],
    dependencies=[Depends(require_role(RoleEnum.STUDENT))],
)


def _get_student_profile(session: Session, user_id: int) -> StudentProfile:
    profile = session.exec(select(StudentProfile).where(StudentProfile.user_id == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile missing")
    return profile


@router.get("/attendance", response_model=list[AttendanceSummaryItem])
def get_attendance_summary(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    student = _get_student_profile(session, current_user.id)
    return summarize_attendance(session, student)


@router.get("/attendance/sessions", response_model=list[AttendanceRecordResponse])
def get_recent_sessions(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    student = _get_student_profile(session, current_user.id)
    records = session.exec(
        select(AttendanceRecord)
        .join(AttendanceSession)
        .where(AttendanceRecord.student_id == student.id)
        .order_by(AttendanceRecord.detected_at.desc())
        .limit(25)
    ).all()
    response = []
    for record in records:
        response.append(
            AttendanceRecordResponse(
                student_id=student.student_id,
                student_name=student.user.full_name,
                status=record.status,
                detected_at=record.detected_at,
                confidence=record.confidence,
            )
        )
    return response


@router.get("/courses", response_model=list[EnrolledCourseResponse])
def get_enrolled_courses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    student = _get_student_profile(session, current_user.id)
    enrollments = session.exec(
        select(Enrollment).where(Enrollment.student_id == student.id)
    ).all()
    
    response = []
    for enrollment in enrollments:
        session.refresh(enrollment, attribute_names=["offering"])
        session.refresh(enrollment.offering, attribute_names=["course", "teacher"])
        offering = enrollment.offering
        response.append(
            EnrolledCourseResponse(
                id=offering.id,
                course_code=offering.course.code,
                course_name=offering.course.name,
                teacher_name=offering.teacher.user.full_name,
                term=offering.term,
                room=offering.room,
                active=offering.active,
            )
        )
    return response


