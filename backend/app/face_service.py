import base64
import json
import os
from functools import lru_cache
from typing import Iterable, Optional, Tuple, List

import cv2
import numpy as np

# We removed 'onnxruntime' to save RAM!

# Model Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")
YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
# Ensure this filename matches exactly what is in your models folder
ARCFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

def _decode_image(image_data: str) -> np.ndarray:
    if not image_data:
        raise ValueError("Image payload missing")
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    buffer = np.frombuffer(base64.b64decode(image_data), dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image")
    return image

@lru_cache
def _get_face_detector():
    if not os.path.exists(YUNET_PATH):
        raise RuntimeError(f"YuNet model not found at {YUNET_PATH}")
    
    detector = cv2.FaceDetectorYN.create(
        model=YUNET_PATH,
        config="",
        input_size=(640, 640), 
        score_threshold=0.5, # Slightly lower threshold for detection
        nms_threshold=0.3,
        top_k=5000,
        backend_id=cv2.dnn.DNN_BACKEND_OPENCV,
        target_id=cv2.dnn.DNN_TARGET_CPU,
    )
    return detector

@lru_cache
def _get_face_recognizer():
    if not os.path.exists(ARCFACE_PATH):
        raise RuntimeError(f"SFace model not found at {ARCFACE_PATH}")
    
    # Use OpenCV's Native SFace Backend (Very Light RAM Usage)
    recognizer = cv2.FaceRecognizerSF.create(
        model=ARCFACE_PATH,
        config="",
        backend_id=cv2.dnn.DNN_BACKEND_OPENCV,
        target_id=cv2.dnn.DNN_TARGET_CPU
    )
    return recognizer

def extract_embedding(image_data: str) -> str:
    """
    Extract face embedding using YuNet (Detection) and SFace (Recognition).
    """
    image = _decode_image(image_data)
    h, w, _ = image.shape
    
    # 1. Detect Face
    detector = _get_face_detector()
    detector.setInputSize((w, h))
    _, faces = detector.detect(image)
    
    if faces is None or len(faces) == 0:
        raise ValueError("No face detected. Ensure good lighting and framing.")
    
    # Get the face with highest confidence (last column is score)
    best_face = faces[np.argmax(faces[:, -1])]
    
    # 2. Recognition (Align & Extract in one step)
    recognizer = _get_face_recognizer()
    
    # SFace has built-in alignment! No need for manual warpAffine.
    aligned_face = recognizer.alignCrop(image, best_face)
    
    # Extract features (128-dim vector for SFace)
    embedding = recognizer.feature(aligned_face)
    
    # 3. Flatten and return
    embedding = embedding.flatten()
    return json.dumps(embedding.tolist())

def cosine_similarity(serialized_a: str, serialized_b: str) -> float:
    vec_a = np.array(json.loads(serialized_a), dtype="float32")
    vec_b = np.array(json.loads(serialized_b), dtype="float32")
    
    # SFace output is already normalized, but we double-check for safety
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

# --- Helper Functions (No changes needed below here) ---

def to_vector(serialized_embedding: str) -> str:
    json.loads(serialized_embedding)
    return serialized_embedding

def serialize_embeddings(embeddings: list[str]) -> str:
    return json.dumps(embeddings)

def deserialize_embeddings(serialized: str) -> str:
    try:
        parsed = json.loads(serialized)
        if isinstance(parsed, list):
            if len(parsed) == 0:
                raise ValueError("No embeddings found")
            
            if isinstance(parsed[0], str):
                vectors = [np.array(json.loads(emb), dtype="float32") for emb in parsed]
                if len(vectors) == 1:
                    return parsed[0]
                avg_vector = np.mean(vectors, axis=0)
                norm = np.linalg.norm(avg_vector)