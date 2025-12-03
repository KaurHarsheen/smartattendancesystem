from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"


class CourseRequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    EXCUSED = "EXCUSED"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    full_name: str
    password_hash: str
    role: RoleEnum = Field(index=True)
    must_change_password: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    teacher_profile: Optional["TeacherProfile"] = Relationship(back_populates="user")
    student_profile: Optional["StudentProfile"] = Relationship(back_populates="user")
    face_embedding: Optional["FaceEmbedding"] = Relationship(back_populates="user")
    admin_login: Optional["AdminLogin"] = Relationship(back_populates="user")
    teacher_login: Optional["TeacherLogin"] = Relationship(back_populates="user")
    student_login: Optional["StudentLogin"] = Relationship(back_populates="user")


class LoginBase(SQLModel, table=False):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    last_login_at: Optional[datetime] = None


class AdminLogin(LoginBase, table=True):
    user: User = Relationship(back_populates="admin_login")


class TeacherLogin(LoginBase, table=True):
    user: User = Relationship(back_populates="teacher_login")


class StudentLogin(LoginBase, table=True):
    user: User = Relationship(back_populates="student_login")


class TeacherProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    teacher_id: str = Field(index=True, unique=True)
    department: Optional[str] = None

    user: User = Relationship(back_populates="teacher_profile")
    offerings: List["CourseOffering"] = Relationship(back_populates="teacher")
    course_requests: List["CourseRequest"] = Relationship(back_populates="teacher")


class StudentProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    student_id: str = Field(index=True, unique=True)
    branch: str
    year: int

    user: User = Relationship(back_populates="student_profile")
    enrollments: List["Enrollment"] = Relationship(back_populates="student")
    attendances: List["AttendanceRecord"] = Relationship(back_populates="student")


class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)
    name: str
    branch: str
    year: int

    offerings: List["CourseOffering"] = Relationship(back_populates="course")
    requests: List["CourseRequest"] = Relationship(back_populates="course")


class CourseOffering(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id")
    teacher_id: int = Field(foreign_key="teacherprofile.id")
    term: str = "2025-SPRING"
    room: Optional[str] = None
    active: bool = Field(default=True)

    course: Course = Relationship(back_populates="offerings")
    teacher: TeacherProfile = Relationship(back_populates="offerings")
    enrollments: List["Enrollment"] = Relationship(back_populates="offering", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    sessions: List["AttendanceSession"] = Relationship(back_populates="offering", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class CourseRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teacherprofile.id")
    course_id: int = Field(foreign_key="course.id")
    status: CourseRequestStatus = Field(default=CourseRequestStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    teacher: TeacherProfile = Relationship(back_populates="course_requests")
    course: Course = Relationship(back_populates="requests")


class Enrollment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    offering_id: int = Field(foreign_key="courseoffering.id")
    student_id: int = Field(foreign_key="studentprofile.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    offering: CourseOffering = Relationship(back_populates="enrollments")
    student: StudentProfile = Relationship(back_populates="enrollments")


class AttendanceSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    offering_id: int = Field(foreign_key="courseoffering.id")
    session_number: int = Field(default=1)
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    active: bool = Field(default=True)

    offering: CourseOffering = Relationship(back_populates="sessions")
    records: List["AttendanceRecord"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class AttendanceRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="attendancesession.id")
    student_id: int = Field(foreign_key="studentprofile.id")
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    status: AttendanceStatus = Field(default=AttendanceStatus.PRESENT)
    confidence: Optional[float] = None

    session: AttendanceSession = Relationship(back_populates="records")
    student: StudentProfile = Relationship(back_populates="attendances")


class FaceEmbedding(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    vector: str
    captured_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="face_embedding")


class FaceUpdateRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    vector: str  # Serialized new embeddings
    image_data: str  # Store one representative image as base64 for admin review (optional but good for UI)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="PENDING")  # PENDING, APPROVED, REJECTED

    user: User = Relationship()


