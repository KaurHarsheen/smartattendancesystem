from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..auth import get_current_user, require_role
from ..crud import close_attendance_session, create_attendance_session
from ..database import get_session
from ..models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    Course,
    CourseOffering,
    CourseRequest,
    CourseRequestStatus,
    Enrollment,
    RoleEnum,
    StudentProfile,
    TeacherProfile,
    User,
)
from ..schemas import (
    AttendanceRecordResponse,
    AttendanceSessionResponse,
    AttendanceSessionStart,
    CourseOfferingResponse,
    CourseRequestCreate,
    CourseRequestResponse,
    EnrolledStudentResponse,
)

router = APIRouter(
    prefix="/teacher",
    tags=["Teacher"],
    dependencies=[Depends(require_role(RoleEnum.TEACHER))],
)


def _get_teacher_profile(session: Session, user_id: int) -> TeacherProfile:
    profile = session.exec(select(TeacherProfile).where(TeacherProfile.user_id == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Teacher profile missing")
    return profile


@router.get("/offerings", response_model=list[CourseOfferingResponse])
def list_offerings(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    teacher = _get_teacher_profile(session, current_user.id)
    offerings = session.exec(select(CourseOffering).where(CourseOffering.teacher_id == teacher.id)).all()
    result = []
    for offering in offerings:
        session.refresh(offering, attribute_names=["course", "teacher"])
        result.append(
            CourseOfferingResponse(
                id=offering.id,
                course_code=offering.course.code,
                course_name=offering.course.name,
                teacher_name=offering.teacher.user.full_name,
                term=offering.term,
                room=offering.room,
                active=offering.active,
            )
        )
    return result


@router.post("/course-requests", response_model=CourseRequestResponse)
def request_course(
    payload: CourseRequestCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    teacher = _get_teacher_profile(session, current_user.id)
    course = session.exec(select(Course).where(Course.code == payload.course_code)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    existing = session.exec(
        select(CourseRequest)
        .where(CourseRequest.teacher_id == teacher.id)
        .where(CourseRequest.course_id == course.id)
        .where(CourseRequest.status == CourseRequestStatus.PENDING)
    ).first()
    if existing:
        request = existing
    else:
        request = CourseRequest(teacher_id=teacher.id, course_id=course.id)
        session.add(request)
        session.commit()
        session.refresh(request)
    return CourseRequestResponse(
        id=request.id,
        course_code=course.code,
        course_name=course.name,
        status=request.status,
        created_at=request.created_at,
    )


@router.post("/attendance/start", response_model=AttendanceSessionResponse)
def start_session(
    payload: AttendanceSessionStart,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    teacher = _get_teacher_profile(session, current_user.id)
    offering = session.get(CourseOffering, payload.course_offering_id)
    if not offering or offering.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Offering not found")
    try:
        attendance_session = create_attendance_session(session, offering.id)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_400_BAD_REQUEST and exc.detail == "A session is already active":
            existing = session.exec(
                select(AttendanceSession)
                .where(AttendanceSession.offering_id == offering.id)
                .where(AttendanceSession.active == True)
            ).first()
            if existing:
                return AttendanceSessionResponse(
                    id=existing.id,
                    course_offering_id=existing.offering_id,
                    start_time=existing.start_time,
                    end_time=existing.end_time,
                    active=existing.active,
                )
        raise
    return AttendanceSessionResponse(
        id=attendance_session.id,
        course_offering_id=attendance_session.offering_id,
        start_time=attendance_session.start_time,
        end_time=attendance_session.end_time,
        active=attendance_session.active,
    )


@router.get("/attendance/active/{offering_id}", response_model=AttendanceSessionResponse)
def get_active_session(
    offering_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    teacher = _get_teacher_profile(session, current_user.id)
    offering = session.get(CourseOffering, offering_id)
    if not offering or offering.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Offering not found")
    active_session = session.exec(
        select(AttendanceSession)
        .where(AttendanceSession.offering_id == offering.id)
        .where(AttendanceSession.active == True)
    ).first()
    if not active_session:
        raise HTTPException(status_code=404, detail="No active session")
    return AttendanceSessionResponse(
        id=active_session.id,
        course_offering_id=active_session.offering_id,
        start_time=active_session.start_time,
        end_time=active_session.end_time,
        active=active_session.active,
    )


@router.post("/attendance/{session_id}/end", response_model=AttendanceSessionResponse)
def end_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    teacher = _get_teacher_profile(session, current_user.id)
    attendance_session = session.get(AttendanceSession, session_id)
    if not attendance_session or attendance_session.offering.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Session not found")
    attendance_session = close_attendance_session(session, session_id)
    return AttendanceSessionResponse(
        id=attendance_session.id,
        course_offering_id=attendance_session.offering_id,
        start_time=attendance_session.start_time,
        end_time=attendance_session.end_time,
        active=attendance_session.active,
    )


@router.get("/attendance/{offering_id}", response_model=list[AttendanceRecordResponse])
def view_attendance(
    offering_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    teacher = _get_teacher_profile(session, current_user.id)
    offering = session.get(CourseOffering, offering_id)
    if not offering or offering.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Offering not found")
    records = session.exec(
        select(AttendanceRecord)
        .join(AttendanceSession)
        .where(AttendanceSession.offering_id == offering_id)
        .order_by(AttendanceRecord.detected_at.desc())
    ).all()
    response = []
    for record in records:
        response.append(
            AttendanceRecordResponse(
                student_id=record.student.student_id,
                student_name=record.student.user.full_name,
                status=record.status,
                detected_at=record.detected_at,
                confidence=record.confidence,
            )
        )
    return response


@router.get("/offerings/{offering_id}/students", response_model=list[EnrolledStudentResponse])
def get_enrolled_students(
    offering_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    teacher = _get_teacher_profile(session, current_user.id)
    offering = session.get(CourseOffering, offering_id)
    if not offering or offering.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Offering not found")
    
    enrollments = session.exec(
        select(Enrollment).where(Enrollment.offering_id == offering_id)
    ).all()
    
    response = []
    for enrollment in enrollments:
        session.refresh(enrollment, attribute_names=["student"])
        session.refresh(enrollment.student, attribute_names=["user"])
        student = enrollment.student
        # Calculate attendance percentage
        total_sessions = len(offering.sessions)
        presents = 0
        for attendance_session in offering.sessions:
            record = session.exec(
                select(AttendanceRecord)
                .where(AttendanceRecord.session_id == attendance_session.id)
                .where(AttendanceRecord.student_id == student.id)
            ).first()
            if record and record.status == AttendanceStatus.PRESENT:
                presents += 1
        
        percentage = (presents / total_sessions * 100) if total_sessions > 0 else 0.0

        response.append(
            EnrolledStudentResponse(
                student_id=student.student_id,
                student_name=student.user.full_name,
                email=student.user.email,
                branch=student.branch,
                year=student.year,
                attendance_percentage=round(percentage, 2),
            )
        )
    return response


