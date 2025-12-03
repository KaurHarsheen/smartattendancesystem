# Smart Attendance System

A modern, AI-powered attendance management system using Face Recognition. Built with React (Frontend) and FastAPI (Backend).

## 🏗 Architecture Overview

The system consists of three main components:

1.  **Frontend (React + Vite)**:
    -   Provides a responsive user interface for Students, Teachers, and Admins.
    -   Uses **Tailwind CSS** for styling and **Zustand** for state management.
    -   Interacts with the backend via RESTful APIs.

2.  **Backend (FastAPI)**:
    -   Handles API requests, authentication, and business logic.
    -   **Face Recognition**: Uses **OpenCV** and **YuNet** (ONNX models) to detect and recognize faces.
    -   **Database**: Uses **SQLite** with **SQLModel** (ORM) for data persistence.

3.  **AI/ML Engine**:
    -   Integrated directly into the backend.
    -   Computes face embeddings and compares them for attendance marking.

## 📂 Code Structure

For a detailed breakdown of the file structure, please refer to [CODE_STRUCTURE.txt](./CODE_STRUCTURE.txt).

## 🚀 Getting Started

### Prerequisites

-   **Python 3.8+**
-   **Node.js 16+**

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv .venv
    # Windows
    .venv\Scripts\activate
    # macOS/Linux
    source .venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Initialize the database and seed initial data:
    ```bash
    python -m app.reset_and_seed
    ```
    *This will create `attendance.db` and `credentials.db` with an initial Admin user.*

5.  Start the backend server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## 🔑 Default Credentials

After running the seed script, you can log in with:

-   **Email**: `admin1@gmail.com`
-   **Password**: `123`

## 🛠 Troubleshooting

-   **Database Issues**: If you encounter database errors, try deleting `backend/attendance.db` and `backend/credentials.db` and re-running `python -m app.reset_and_seed`.
-   **Missing Models**: Ensure the `backend/models` directory contains the required `.onnx` files.
