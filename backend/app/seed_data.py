import random
from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.auth import hash_password
from app.credential_store import record_credentials
from app.crud import (
    auto_enroll_student,
    create_attendance_session,
    create_course_offering,
    ensure_curriculum_courses,
    ensure_role_login_entry,
    generate_student_id,
    generate_teacher_id,
)
from app.database import engine, init_db
from app.models import (
    AttendanceRecord,
    AttendanceStatus,
    Course,
    RoleEnum,
    StudentProfile,
    TeacherProfile,
    User,
)

def create_user_direct(session: Session, email: str, full_name: str, role: RoleEnum) -> User:
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        return existing
    
    password = "password123"
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=hash_password(password),
        must_change_password=False
    )
    session.add(user)
    session.flush()
    ensure_role_login_entry(session, user)
    record_credentials(email=email, role=role.value, full_name=full_name, plain_password=password)
    return user

def seed_data():
    init_db()
    with Session(engine) as session:
        ensure_curriculum_courses(session)
        
        # 1. Create Teachers
        departments = ["Computer Science", "Electronics", "Mechanical", "Civil"]
        teachers = []
        for i in range(5):
            dept = departments[i % len(departments)]
            user = create_user_direct(session, f"teacher{i+1}@example.com", f"Teacher {i+1}", RoleEnum.TEACHER)
            
            teacher = session.exec(select(TeacherProfile).where(TeacherProfile.user_id == user.id)).first()
            if not teacher:
                teacher = TeacherProfile(
                    user_id=user.id,
                    teacher_id=generate_teacher_id(session),
                    department=dept
                )
                session.add(teacher)
                session.flush()
            teachers.append(teacher)
        
        print(f"Seeded {len(teachers)} teachers.")

        # 2. Create Course Offerings
        courses = session.exec(select(Course)).all()
        offerings = []
        
        # Assign random courses to teachers
        for teacher in teachers:
            # Each teacher gets 2-3 courses
            teacher_courses = random.sample(courses, k=random.randint(2, 3))
            for course in teacher_courses:
                # Check if offering exists
                # For simplicity, we just create a new offering if not exists for this teacher/course/term
                # But crud.create_course_offering does checks. We'll use the crud function or direct creation.
                # Let's use direct creation to avoid re-fetching too much
                
                offering = create_course_offering(
                    session, 
                    course_code=course.code, 
                    teacher_id=teacher.teacher_id, 
                    term="2025-SPRING", 
                    room=f"Room-{random.randint(100, 500)}"
                )
                offerings.append(offering)
        
        print(f"Seeded {len(offerings)} course offerings.")

        # 3. Create Students
        branches = ["CSE", "ECE", "ME", "CE"]
        students = []
        for i in range(50): # 50 students
            branch = branches[i % len(branches)]
            year = 2025
            user = create_user_direct(session, f"student{i+1}@example.com", f"Student {i+1}", RoleEnum.STUDENT)
            
            student = session.exec(select(StudentProfile).where(StudentProfile.user_id == user.id)).first()
            if not student:
                student = StudentProfile(
                    user_id=user.id,
                    student_id=generate_student_id(branch, year, session),
                    branch=branch,
                    year=year
                )
                session.add(student)
                session.flush()
                auto_enroll_student(session, student)
            students.append(student)
            
        print(f"Seeded {len(students)} students.")

        # 4. Simulate Attendance
        # For each offering, create 5-10 sessions
        for offering in offerings:
            # Get enrolled students
            # We need to refresh offering to get enrollments if they were added via auto_enroll_student
            session.refresh(offering)
            # But auto_enroll_student might not have caught up if we didn't commit/refresh? 
            # Actually auto_enroll_student commits? No, it takes session.
            # Let's just query enrollments
            
            enrolled_students_ids = [e.student_id for e in offering.enrollments]
            
            if not enrolled_students_ids:
                continue

            num_sessions = random.randint(5, 10)
            for s_idx in range(num_sessions):
                # Create a session in the past
                session_start = datetime.utcnow() - timedelta(days=random.randint(1, 30))
                attendance_session = create_attendance_session(session, offering.id)
                attendance_session.active = False # Close it immediately
                attendance_session.start_time = session_start
                attendance_session.end_time = session_start + timedelta(hours=1)
                session.add(attendance_session)
                session.flush()

                # Mark attendance
                for student_id in enrolled_students_ids:
                    # 80% chance of being present
                    if random.random() < 0.8:
                        record = AttendanceRecord(
                            session_id=attendance_session.id,
                            student_id=student_id,
                            detected_at=session_start + timedelta(minutes=random.randint(0, 50)),
                            status=AttendanceStatus.PRESENT,
                            confidence=random.uniform(0.85, 0.99)
                        )
                        session.add(record)
        
        session.commit()
        print("Attendance data seeded.")

if __name__ == "__main__":
    seed_data()
