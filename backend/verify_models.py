import sys
import os

# Add app to path
sys.path.append(os.getcwd())

try:
    from app.face_service import _get_face_detector, _get_face_recognizer
    
    print("Loading Face Detector (YuNet)...")
    detector = _get_face_detector()
    print(f"Detector loaded: {detector}")
    
    print("Loading Face Recognizer (ArcFace)...")
    recognizer = _get_face_recognizer()
    print(f"Recognizer loaded: {recognizer}")
    
    print("Verification Successful: All models loaded.")
except Exception as e:
    print(f"Verification Failed: {e}")
    sys.exit(1)
