import secrets
import string
from datetime import datetime
from typing import List, Optional, Type

from fastapi import HTTPException, status
from sqlmodel import Session, select

from .auth import hash_password
from .config import get_settings
from .credential_store import record_credentials
from .models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    AdminLogin,
    Course,
    CourseOffering,
    CourseRequest,
    CourseRequestStatus,
    Enrollment,
    LoginBase,
    RoleEnum,
    StudentProfile,
    TeacherProfile,
    TeacherLogin,
    User,
    StudentLogin,
)
from .schemas import AttendanceSummaryItem

settings = get_settings()


def _login_model_for_role(role: RoleEnum) -> Type[LoginBase]:
    mapping: dict[RoleEnum, Type[LoginBase]] = {
        RoleEnum.ADMIN: AdminLogin,
        RoleEnum.TEACHER: TeacherLogin,
        RoleEnum.STUDENT: StudentLogin,
    }
    return mapping[role]


def ensure_role_login_entry(session: Session, user: User) -> LoginBase:
    login_model = _login_model_for_role(user.role)
    entry = session.exec(select(login_model).where(login_model.user_id == user.id)).first()
    if not entry:
        entry = login_model(user_id=user.id, email=user.email, password_hash=user.password_hash)
    else:
        entry.email = user.email
        entry.password_hash = user.password_hash
    session.add(entry)
    session.flush()
    return entry


def _random_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_teacher_id(session: Session) -> str:
    while True:
        candidate = f"TCHR{secrets.randbelow(10000):04d}"
        exists = session.exec(select(TeacherProfile).where(TeacherProfile.teacher_id == candidate)).first()
        if not exists:
            return candidate


def generate_student_id(branch: str, year: int, session: Session) -> str:
    prefix = f"STUD{year}{branch.upper()}"
    while True:
        candidate = f"{prefix}{secrets.randbelow(1000):03d}"
        exists = session.exec(select(StudentProfile).where(StudentProfile.student_id == candidate)).first()
        if not exists:
            return candidate


def ensure_curriculum_courses(session: Session) -> None:
    for (branch, year), names in settings.curriculum_map.items():
        for name in names:
            code = f"{branch.upper()}{year}-{name.split()[0].upper()}"
            existing = session.exec(select(Course).where(Course.code == code)).first()
            if not existing:
                course = Course(code=code, name=name, branch=branch, year=year)
                session.add(course)
    session.commit()


def create_user(session: Session, email: str, full_name: str, role: RoleEnum) -> tuple[User, str]:
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    raw_password = _random_password(settings.default_password_length)
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=hash_password(raw_password),
    )
    session.add(user)
    session.flush()
    ensure_role_login_entry(session, user)
    record_credentials(email=user.email, role=user.role.value, full_name=user.full_name, plain_password=raw_password)
    return user, raw_password


def create_teacher(
    session: Session, email: str, full_name: str, department: Optional[str], requested_courses: List[str]
) -> dict:
    user, temp_password = create_user(session, email, full_name, RoleEnum.TEACHER)
    teacher_id = generate_teacher_id(session)
    teacher = TeacherProfile(user_id=user.id, teacher_id=teacher_id, department=department)
    session.add(teacher)
    session.flush()

    ensure_curriculum_courses(session)
    for course_code in requested_courses:
        course = session.exec(select(Course).where(Course.code == course_code)).first()
        if course:
            request = CourseRequest(teacher_id=teacher.id, course_id=course.id)
            session.add(request)

    session.commit()
    return {"user": user, "teacher": teacher, "password": temp_password}


def create_student(session: Session, email: str, full_name: str, branch: str, year: int) -> dict:
    user, temp_password = create_user(session, email, full_name, RoleEnum.STUDENT)
    student_id = generate_student_id(branch, year, session)
    student = StudentProfile(user_id=user.id, student_id=student_id, branch=branch, year=year)
    session.add(student)
    session.flush()

    ensure_curriculum_courses(session)
    auto_enroll_student(session, student)
    session.commit()
    return {"user": user, "student": student, "password": temp_password}


def auto_enroll_student(session: Session, student: StudentProfile) -> None:
    offerings = session.exec(
        select(CourseOffering)
        .join(Course)
        .where(Course.branch == student.branch)
        .where(Course.year == student.year)
    ).all()

    for offering in offerings:
        exists = session.exec(
            select(Enrollment)
            .where(Enrollment.offering_id == offering.id)
            .where(Enrollment.student_id == student.id)
        ).first()
        if not exists:
            session.add(Enrollment(offering_id=offering.id, student_id=student.id))


def enroll_existing_students(session: Session, offering: CourseOffering) -> None:
    students = session.exec(
        select(StudentProfile).where(StudentProfile.branch == offering.course.branch).where(StudentProfile.year == offering.course.year)
    ).all()
    for student in students:
        exists = session.exec(
            select(Enrollment)
            .where(Enrollment.offering_id == offering.id)
            .where(Enrollment.student_id == student.id)
        ).first()
        if not exists:
            session.add(Enrollment(offering_id=offering.id, student_id=student.id))


def approve_course_request(session: Session, request_id: int) -> CourseRequest:
    request = session.get(CourseRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Course request not found")
    request.status = CourseRequestStatus.APPROVED
    request.updated_at = datetime.utcnow()
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


def create_course_offering(session: Session, course_code: str, teacher_id: str, term: str, room: Optional[str]) -> CourseOffering:
    course = session.exec(select(Course).where(Course.code == course_code)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    teacher = session.exec(select(TeacherProfile).where(TeacherProfile.teacher_id == teacher_id)).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    offering = CourseOffering(course_id=course.id, teacher_id=teacher.id, term=term, room=room)
    session.add(offering)
    session.flush()
    enroll_existing_students(session, offering)
    session.commit()
    session.refresh(offering)
    return offering


def create_attendance_session(session: Session, offering_id: int) -> AttendanceSession:
    offering = session.get(CourseOffering, offering_id)
    if not offering or not offering.active:
        raise HTTPException(status_code=404, detail="Offering not found or inactive")
    active_session = session.exec(
        select(AttendanceSession).where(AttendanceSession.offering_id == offering_id).where(AttendanceSession.active == True)
    ).first()
    if active_session:
        raise HTTPException(status_code=400, detail="A session is already active")
    
    # Calculate next session number
    last_session = session.exec(
        select(AttendanceSession)
        .where(AttendanceSession.offering_id == offering_id)
        .order_by(AttendanceSession.session_number.desc())
    ).first()
    next_number = (last_session.session_number + 1) if last_session else 1

    attendance_session = AttendanceSession(offering_id=offering_id, session_number=next_number)
    session.add(attendance_session)
    session.commit()
    session.refresh(attendance_session)
    return attendance_session


def close_attendance_session(session: Session, session_id: int) -> AttendanceSession:
    attendance_session = session.get(AttendanceSession, session_id)
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Session not found")
    attendance_session.active = False
    attendance_session.end_time = datetime.utcnow()
    session.add(attendance_session)
    session.commit()
    session.refresh(attendance_session)
    return attendance_session


def record_detection(session: Session, attendance_session_id: int, student_identifier: str, confidence: Optional[float]) -> AttendanceRecord:
    attendance_session = session.get(AttendanceSession, attendance_session_id)
    if not attendance_session or not attendance_session.active:
        raise HTTPException(status_code=400, detail="Session is not active")
    student = session.exec(select(StudentProfile).where(StudentProfile.student_id == student_identifier)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    existing = session.exec(
        select(AttendanceRecord)
        .where(AttendanceRecord.session_id == attendance_session_id)
        .where(AttendanceRecord.student_id == student.id)
    ).first()
    if existing:
        existing.detected_at = datetime.utcnow()
        existing.status = AttendanceStatus.PRESENT
        existing.confidence = confidence
        record = existing
    else:
        record = AttendanceRecord(
            session_id=attendance_session_id,
            student_id=student.id,
            confidence=confidence,
        )
        session.add(record)
    session.commit()
    session.refresh(record)
    return record


def summarize_attendance(session: Session, student: StudentProfile) -> List[AttendanceSummaryItem]:
    items: List[AttendanceSummaryItem] = []
    enrollments = session.exec(
        select(Enrollment).where(Enrollment.student_id == student.id)
    ).all()
    for enrollment in enrollments:
        course = enrollment.offering.course
        sessions = enrollment.offering.sessions
        total_sessions = len(sessions)
        presents = 0
        for attendance_session in sessions:
            record = session.exec(
                select(AttendanceRecord)
                .where(AttendanceRecord.session_id == attendance_session.id)
                .where(AttendanceRecord.student_id == student.id)
            ).first()
            if record and record.status == AttendanceStatus.PRESENT:
                presents += 1
        percentage = (presents / total_sessions * 100) if total_sessions else 0.0
        items.append(
            AttendanceSummaryItem(
                course_code=course.code,
                course_name=course.name,
                presents=presents,
                totals=total_sessions,
                percentage=round(percentage, 2),
            )
        )
    return items


def compute_dashboard_summary(session: Session) -> dict:
    total_users = session.exec(select(User)).all()
    total_teachers = session.exec(select(TeacherProfile)).all()
    total_students = session.exec(select(StudentProfile)).all()
    total_courses = session.exec(select(Course)).all()
    active_sessions = session.exec(select(AttendanceSession).where(AttendanceSession.active == True)).all()
    return {
        "total_users": len(total_users),
        "total_teachers": len(total_teachers),
        "total_students": len(total_students),
        "total_courses": len(total_courses),
        "active_sessions": len(active_sessions),
    }


