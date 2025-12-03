import os
import shutil
from datetime import datetime, timedelta
from sqlmodel import Session, SQLModel, create_engine, select
from app.models import (
    User, RoleEnum, TeacherProfile, StudentProfile, Course, CourseOffering,
    Enrollment, AttendanceSession, AttendanceRecord, AttendanceStatus,
    AdminLogin, TeacherLogin, StudentLogin, FaceEmbedding
)
from app.auth import hash_password

# Database configuration
SQLITE_FILE_NAME = "attendance.db"
CREDENTIALS_FILE_NAME = "credentials.db"
SQLITE_URL = f"sqlite:///{SQLITE_FILE_NAME}"

def reset_database(engine):
    """Drop all tables and recreate them."""
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    print("Dropped and recreated tables")

def seed_data(session: Session):
    
    # 1. Create Admin
    admin_email = "admin1@gmail.com"
    admin_password = "123"
    admin_user = User(
        email=admin_email,
        full_name="System Administrator",
        password_hash=hash_password(admin_password),
        role=RoleEnum.ADMIN,
        must_change_password=False
    )
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)
    
    admin_login = AdminLogin(
        user_id=admin_user.id,
        email=admin_email,
        password_hash=hash_password(admin_password)
    )
    session.add(admin_login)
    print(f"Created Admin: {admin_email} / {admin_password}")

    # 2. Define Structure
    branches = ["COE", "ECE"]
    years = [1, 2, 3, 4]
    subjects_per_year = 5
    
    # 3. Create Courses Only (No Teachers, No Offerings)
    for branch in branches:
        for year in years:
            for subj in range(1, subjects_per_year + 1):
                course_code = f"{branch}{year}0{subj}"
                course_name = f"{branch} Year {year} Subject {subj}"
                
                course = Course(
                    code=course_code,
                    name=course_name,
                    branch=branch,
                    year=year
                )
                session.add(course)
    
    session.commit()
    print("Created Courses (Metadata only)")

    # 4. No Teachers, No Students, No Offerings
    print("Skipped creating Teachers, Students, and Offerings as per request.")
    print("Database reset and seeded with Admin and Courses only.")
    print("Database reset and seeded successfully!")

if __name__ == "__main__":
    engine = create_engine(SQLITE_URL)
    reset_database(engine)
    with Session(engine) as session:
        seed_data(session)
