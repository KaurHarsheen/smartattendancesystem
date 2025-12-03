# Testing Guide

## Step 1: Start the Backend Server

Open a terminal/PowerShell and run:

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The backend should start on `http://localhost:8000`

**Verify it's running:** Open `http://localhost:8000/health` in your browser - you should see `{"status":"ok"}`

## Step 2: Start the Frontend Server

Open a **NEW** terminal/PowerShell window and run:

```powershell
cd frontend
npm run dev
```

The frontend should start on `http://localhost:5173`

## Step 3: Create Test Data

### 3.1 Create an Admin Account

In the backend terminal (where uvicorn is running), open a **NEW** PowerShell window:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m app.seed
```

When prompted, enter:
- **Admin email:** `admin@test.com`
- **Full name:** `Admin User`
- **Password:** `admin123` (or any password you prefer)

### 3.2 Login as Admin and Create Test Users

1. Open `http://localhost:5173` in your browser
2. Login with the admin credentials you just created
3. In the Admin Dashboard:
   - **Register a Teacher:**
     - Email: `teacher@test.com`
     - Full Name: `Teacher User`
     - Department: `Computer Science` (optional)
     - Click "Register Teacher"
     - **Note the temporary password** shown in the response
   
   - **Register a Student:**
     - Email: `student@test.com`
     - Full Name: `Student User`
     - Branch: `COE` (or `ECE`)
     - Year: `3`
     - Click "Register Student"
     - **Note the temporary password** shown in the response

### 3.3 Enroll Student's Face

1. Logout and login as the **Student** using the credentials from step 3.2
2. In the Student Dashboard, go to the "Face Enrollment" section
3. Capture **at least 3 face samples** using the camera
4. Click "Save Samples" to enroll the face
5. You should see "Enrolled: Yes (3 samples)"

### 3.4 Create Course Offering (as Admin)

1. Logout and login back as **Admin**
2. In Admin Dashboard, find the "Course Offerings" section
3. Create a course offering:
   - Select the teacher you created
   - Select a course (e.g., "Image Processing" for COE year 3)
   - Term: `2025-SPRING`
   - Room: `Room 101` (optional)
   - Click "Create Offering"

## Step 4: Test the New Features

### 4.1 Test Session Start

1. Logout and login as the **Teacher**
2. Go to the Teacher Dashboard
3. You should see:
   - A dropdown with course offerings
   - "Active Session ID" showing "—"
4. Select a course offering from the dropdown
5. Click **"Start Session"**
6. **Verify:**
   - ✅ Session ID appears prominently as "Session #X" (where X is the session ID number)
   - ✅ Toast message shows "Session X started successfully!"
   - ✅ The session ID is displayed in bold, large text

### 4.2 Test Face Capture and Verification

1. With a session active, you should see:
   - The main "Face Verification Scanner" with a camera feed
   - A **"Click to Capture Image"** button below it (purple button)
   - The button should be enabled

2. **Test the capture:**
   - Click the **"Click to Capture Image"** button
   - The button should show "Processing..." while verifying
   - After processing, you should see:
     - ✅ Status message (success or error)
     - ✅ **Face Embeddings section** appears below showing:
       - "Probe Embedding (Captured Image)" - the embedding from your captured image
       - "Matched Embedding (Most Similar)" - the embedding that matched (if found)
     - ✅ **Latest Attendance table** updates with the new record (if match found)

3. **Test with enrolled student:**
   - Have the enrolled student stand in front of the camera
   - Click "Click to Capture Image"
   - **Verify:**
     - ✅ Success message: "Marked [Student Name] ([Student ID]) • confidence X.XX"
     - ✅ Probe embedding is displayed
     - ✅ Matched embedding is displayed
     - ✅ New attendance record appears in "Latest Attendance" table
     - ✅ Record shows: Student name, Status (PRESENT), Time, Confidence score

4. **Test with unrecognized face:**
   - Have someone else (not enrolled) stand in front of camera
   - Click "Click to Capture Image"
   - **Verify:**
     - ✅ Error message: "Face not recognized..."
     - ✅ Probe embedding is displayed
     - ✅ No matched embedding (or shows "No match found")
     - ✅ Attendance table does NOT add a new record

### 4.3 Test Attendance Updates

1. Capture multiple faces (both recognized and unrecognized)
2. **Verify:**
   - ✅ After **every** capture (whether match or not), the attendance table refreshes
   - ✅ Latest records appear at the top (sorted by most recent)
   - ✅ Each record shows correct student info, timestamp, and confidence

### 4.4 Test Session End

1. Click **"End Session"** button
2. **Verify:**
   - ✅ Session ID disappears (shows "—")
   - ✅ Toast message confirms session ended
   - ✅ "Click to Capture Image" button disappears
   - ✅ Cannot capture images without an active session

## Step 5: View Embeddings

When you capture a face, scroll down below the camera section to see:

1. **Probe Embedding:** The face embedding extracted from the captured image (JSON format)
2. **Matched Embedding:** The embedding from the database that was most similar (if a match was found)

These are displayed in scrollable text boxes showing the first 200 characters (with "..." if longer).

## Troubleshooting

### Backend won't start
- Make sure virtual environment is activated: `.venv\Scripts\Activate.ps1`
- Check if port 8000 is already in use
- Verify all dependencies are installed: `pip install -r requirements.txt`

### Frontend won't start
- Make sure you're in the `frontend` directory
- Install dependencies: `npm install`
- Check if port 5173 is already in use

### "Unable to start session" error
- Make sure you've created a course offering first (as Admin)
- Verify the teacher is assigned to the offering
- Check browser console for detailed error messages

### Face not being recognized
- Make sure the student has enrolled their face (at least 3 samples)
- Ensure good lighting and clear face visibility
- Check that the student is enrolled in the course offering

### Embeddings not showing
- Check browser console for errors
- Verify the backend is returning the embedding data (check Network tab in browser DevTools)
- Make sure you've captured an image (clicked the capture button)

## Quick Test Checklist

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] Admin account created
- [ ] Teacher account created
- [ ] Student account created
- [ ] Student face enrolled (3+ samples)
- [ ] Course offering created
- [ ] Session starts and shows Session ID
- [ ] "Click to Capture Image" button appears
- [ ] Face capture works
- [ ] Embeddings are displayed (probe and matched)
- [ ] Attendance table updates after each capture
- [ ] Session can be ended

