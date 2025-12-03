from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import require_role
from ..crud import (
    approve_course_request,
    compute_dashboard_summary,
    create_course_offering,
    create_student,
    create_teacher,
    ensure_curriculum_courses,
)
from ..database import get_session
from ..models import Course, RoleEnum, TeacherProfile
from ..schemas import (
    CourseCreateRequest,
    CourseOfferingCreateRequest,
    CourseOfferingResponse,
    CourseResponse,
    DashboardSummary,
    StudentCreateRequest,
    StudentResponse,
    StudentProvisionResponse,
    TeacherCreateRequest,
    TeacherDetailResponse,
    TeacherProvisionResponse,
    TeacherResponse,
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role(RoleEnum.ADMIN))],
)


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(session: Session = Depends(get_session)):
    ensure_curriculum_courses(session)
    return compute_dashboard_summary(session)


@router.post("/teachers", response_model=TeacherProvisionResponse)
def register_teacher(payload: TeacherCreateRequest, session: Session = Depends(get_session)):
    result = create_teacher(session, payload.email, payload.full_name, payload.department, payload.requested_courses)
    teacher = result["teacher"]
    user = result["user"]
    teacher_payload = TeacherResponse(
        id=teacher.id,
        email=user.email,
        full_name=user.full_name,
        teacher_id=teacher.teacher_id,
        department=teacher.department,
    )
    return TeacherProvisionResponse(teacher=teacher_payload, temporary_password=result["password"])


@router.post("/students", response_model=StudentProvisionResponse)
def register_student(payload: StudentCreateRequest, session: Session = Depends(get_session)):
    result = create_student(session, payload.email, payload.full_name, payload.branch, payload.year)
    student = result["student"]
    user = result["user"]
    student_payload = StudentResponse(
        id=student.id,
        email=user.email,
        full_name=user.full_name,
        student_id=student.student_id,
        branch=student.branch,
        year=student.year,
    )
    return StudentProvisionResponse(student=student_payload, temporary_password=result["password"])


@router.post("/courses", response_model=CourseResponse)
def create_course(payload: CourseCreateRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(Course).where(Course.code == payload.code)).first()
    if existing:
        return CourseResponse(
            id=existing.id,
            code=existing.code,
            name=existing.name,
            branch=existing.branch,
            year=existing.year,
        )
    course = Course(code=payload.code, name=payload.name, branch=payload.branch, year=payload.year)
    session.add(course)
    session.commit()
    session.refresh(course)
    return CourseResponse(
        id=course.id,
        code=course.code,
        name=course.name,
        branch=course.branch,
        year=course.year,
    )


@router.get("/courses", response_model=list[CourseResponse])
def list_courses(session: Session = Depends(get_session)):
    ensure_curriculum_courses(session)
    courses = session.exec(select(Course)).all()
    return [
        CourseResponse(
            id=course.id,
            code=course.code,
            name=course.name,
            branch=course.branch,
            year=course.year,
        )
        for course in courses
    ]


@router.post("/course-offerings", response_model=CourseOfferingResponse)
def create_offering(payload: CourseOfferingCreateRequest, session: Session = Depends(get_session)):
    offering = create_course_offering(session, payload.course_code, payload.teacher_id, payload.term, payload.room)
    response = CourseOfferingResponse(
        id=offering.id,
        course_code=offering.course.code,
        course_name=offering.course.name,
        teacher_name=offering.teacher.user.full_name,
        term=offering.term,
        room=offering.room,
        active=offering.active,
    )
    return response


@router.post("/course-requests/{request_id}/approve")
def approve_request(request_id: int, session: Session = Depends(get_session)):
    request = approve_course_request(session, request_id)
    return {
        "request_id": request.id,
        "status": request.status,
    }


@router.get("/teachers", response_model=list[TeacherResponse])
def list_teachers(session: Session = Depends(get_session)):
    teachers = session.exec(select(TeacherProfile)).all()
    responses = []
    for teacher in teachers:
        responses.append(
            TeacherResponse(
                id=teacher.id,
                email=teacher.user.email,
                full_name=teacher.user.full_name,
                teacher_id=teacher.teacher_id,
                department=teacher.department,
            )
        )
    return responses


@router.get("/teachers/details", response_model=list[TeacherDetailResponse])
def list_teachers_details(session: Session = Depends(get_session)):
    teachers = session.exec(select(TeacherProfile)).all()
    responses = []
    for teacher in teachers:
        offerings_payload = []
        for offering in teacher.offerings:
            offerings_payload.append(
                CourseOfferingResponse(
                    id=offering.id,
                    course_code=offering.course.code,
                    course_name=offering.course.name,
                    teacher_name=teacher.user.full_name,
                    term=offering.term,
                    room=offering.room,
                    active=offering.active,
                )
            )
        
        responses.append(
            TeacherDetailResponse(
                id=teacher.id,
                email=teacher.user.email,
                full_name=teacher.user.full_name,
                teacher_id=teacher.teacher_id,
                department=teacher.department,
                offerings=offerings_payload
            )
        )
    return responses


@router.delete("/course-offerings/{offering_id}")
def delete_course_offering(offering_id: int, session: Session = Depends(get_session)):
    from ..models import CourseOffering
    offering = session.get(CourseOffering, offering_id)
    if not offering:
        raise HTTPException(status_code=404, detail="Offering not found")
    
    # Optional: Check if there are dependent records (enrollments/sessions) and handle accordingly
    # For now, we'll assume cascade delete or let SQLModel handle it if configured, 
    # but typically you might want to prevent deletion if sessions exist.
    # However, user asked for "remove course", so we'll allow it.
    session.delete(offering)
    session.commit()
    return {"message": "Course offering deleted"}


@router.get("/students", response_model=list[StudentResponse])
def list_students(session: Session = Depends(get_session)):
    from ..models import StudentProfile
    students = session.exec(select(StudentProfile)).all()
    responses = []
    for student in students:
        responses.append(
            StudentResponse(
                id=student.id,
                email=student.user.email,
                full_name=student.user.full_name,
                student_id=student.student_id,
                branch=student.branch,
                year=student.year,
            )
        )
    return responses


@router.get("/face-requests")
def list_face_requests(session: Session = Depends(get_session)):
    from ..models import FaceUpdateRequest
    requests = session.exec(select(FaceUpdateRequest).where(FaceUpdateRequest.status == "PENDING")).all()
    
    result = []
    for req in requests:
        result.append({
            "id": req.id,
            "user_id": req.user_id,
            "user_name": req.user.full_name,
            "user_email": req.user.email,
            "image_data": req.image_data,
            "created_at": req.created_at
        })
    return result


@router.post("/face-requests/{request_id}/approve")
def approve_face_request(request_id: int, session: Session = Depends(get_session)):
    from ..models import FaceUpdateRequest, FaceEmbedding
    
    request = session.get(FaceUpdateRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if request.status != "PENDING":
        raise HTTPException(status_code=400, detail="Request already processed")
        
    # Update the actual face embedding
    existing_embedding = session.exec(select(FaceEmbedding).where(FaceEmbedding.user_id == request.user_id)).first()
    if existing_embedding:
        existing_embedding.vector = request.vector
        session.add(existing_embedding)
    else:
        # Should not happen given logic, but safe fallback
        session.add(FaceEmbedding(user_id=request.user_id, vector=request.vector))
        
    request.status = "APPROVED"
    session.add(request)
    session.commit()
    return {"message": "Request approved"}


@router.post("/face-requests/{request_id}/reject")
def reject_face_request(request_id: int, session: Session = Depends(get_session)):
    from ..models import FaceUpdateRequest
    
    request = session.get(FaceUpdateRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if request.status != "PENDING":
        raise HTTPException(status_code=400, detail="Request already processed")
        
    request.status = "REJECTED"
    session.add(request)
    session.commit()
    return {"message": "Request rejected"}


