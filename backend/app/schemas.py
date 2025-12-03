from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from .models import AttendanceStatus, CourseRequestStatus, RoleEnum


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(Token):
    role: RoleEnum
    must_change_password: bool
    full_name: str


class TokenPayload(BaseModel):
    sub: str
    role: RoleEnum
    exp: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class TeacherCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    department: Optional[str] = None
    requested_courses: List[str] = []


class TeacherResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    teacher_id: str
    department: Optional[str]

    class Config:
        from_attributes = True


class TeacherDetailResponse(TeacherResponse):
    offerings: List["CourseOfferingResponse"]


class TeacherProvisionResponse(BaseModel):
    teacher: TeacherResponse
    temporary_password: str


class StudentCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    branch: str
    year: int


class StudentResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    student_id: str
    branch: str
    year: int

    class Config:
        from_attributes = True


class StudentProvisionResponse(BaseModel):
    student: StudentResponse
    temporary_password: str


class CourseCreateRequest(BaseModel):
    code: str
    name: str
    branch: str
    year: int


class CourseResponse(BaseModel):
    id: int
    code: str
    name: str
    branch: str
    year: int

    class Config:
        from_attributes = True


class CourseOfferingCreateRequest(BaseModel):
    course_code: str
    teacher_id: str
    term: str
    room: Optional[str] = None


class CourseOfferingResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    teacher_name: str
    term: str
    room: Optional[str]
    active: bool


class CourseRequestResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    status: CourseRequestStatus
    created_at: datetime

    class Config:
        from_attributes = True


class CourseRequestCreate(BaseModel):
    course_code: str


class AttendanceSessionStart(BaseModel):
    course_offering_id: int


class AttendanceSessionResponse(BaseModel):
    id: int
    course_offering_id: int
    start_time: datetime
    end_time: Optional[datetime]
    active: bool

    class Config:
        from_attributes = True


class AttendanceDetectionPayload(BaseModel):
    student_id: str
    confidence: Optional[float] = None


class AttendanceSummaryItem(BaseModel):
    course_code: str
    course_name: str
    presents: int
    totals: int
    percentage: float


class AttendanceRecordResponse(BaseModel):
    student_id: str
    student_name: str
    status: AttendanceStatus
    detected_at: datetime
    confidence: Optional[float]


class FaceCaptureRequest(BaseModel):
    image_data: Optional[str] = None  # single capture fallback
    images: List[str] = []  # batch capture payload


class FaceEnrollmentStatus(BaseModel):
    enrolled: bool
    samples: int = 0


class FaceVerificationRequest(BaseModel):
    image_data: str


class FaceVerificationResponse(BaseModel):
    matched: bool
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    confidence: Optional[float] = None
    message: str
    probe_embedding: Optional[str] = None  # The embedding extracted from the captured image
    matched_embedding: Optional[str] = None  # The embedding that was matched (if any)


class DashboardSummary(BaseModel):
    total_users: int
    total_teachers: int
    total_students: int
    total_courses: int
    active_sessions: int


class EnrolledCourseResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    teacher_name: str
    term: str
    room: Optional[str]
    active: bool


class EnrolledStudentResponse(BaseModel):
    student_id: str
    student_name: str
    email: str
    branch: str
    year: int
    attendance_percentage: float = 0.0


