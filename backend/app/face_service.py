import base64
import json
import os
from functools import lru_cache
from typing import Iterable, Optional, Tuple, List

import cv2
import numpy as np
import onnxruntime as ort

# Model Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")
YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
ARCFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

# ArcFace Standard Landmarks (112x112)
ARCFACE_DST = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)

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
        input_size=(640, 640), # Default, will be updated per image
        score_threshold=0.6,
        nms_threshold=0.3,
        top_k=5000,
        backend_id=cv2.dnn.DNN_BACKEND_OPENCV,
        target_id=cv2.dnn.DNN_TARGET_CPU,
    )
    return detector

@lru_cache
def _get_face_recognizer():
    if not os.path.exists(ARCFACE_PATH):
        raise RuntimeError(f"ArcFace model not found at {ARCFACE_PATH}")
    
    providers = ['CPUExecutionProvider']
    session = ort.InferenceSession(ARCFACE_PATH, providers=providers)
    return session

def _align_face(image: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
    """Align face using similarity transform."""
    tform = cv2.estimateAffinePartial2D(landmarks, ARCFACE_DST)[0]
    output = cv2.warpAffine(image, tform, (112, 112), borderValue=0.0)
    return output

def extract_embedding(image_data: str) -> str:
    """
    Extract face embedding using YuNet (Detection) and ArcFace (Recognition).
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
    # YuNet output: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
    # Landmarks are indices 4-13 (5 points * 2 coords)
    best_face = faces[np.argmax(faces[:, -1])]
    
    # Extract landmarks
    landmarks = best_face[4:14].reshape((5, 2))
    
    # 2. Align Face
    aligned_face = _align_face(image, landmarks)
    
    # 3. Preprocess for ArcFace
    # Normalize to [-1, 1] and transpose to (1, 3, 112, 112)
    input_blob = cv2.dnn.blobFromImage(
        aligned_face, 
        scalefactor=1.0 / 127.5, 
        size=(112, 112), 
        mean=(127.5, 127.5, 127.5), 
        swapRB=True
    )
    
    # 4. Run Inference
    recognizer = _get_face_recognizer()
    input_name = recognizer.get_inputs()[0].name
    embedding = recognizer.run(None, {input_name: input_blob})[0]
    
    # 5. Normalize Embedding
    embedding = embedding.flatten()
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
        
    return json.dumps(embedding.tolist())

def cosine_similarity(serialized_a: str, serialized_b: str) -> float:
    vec_a = np.array(json.loads(serialized_a), dtype="float32")
    vec_b = np.array(json.loads(serialized_b), dtype="float32")
    denom = np.linalg.norm(vec_a) * np.linalg.norm(vec_b)
    if denom == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / denom)

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
                if norm > 0:
                    avg_vector /= norm
                return json.dumps(avg_vector.tolist())
            
            elif isinstance(parsed[0], list):
                if len(parsed) == 1:
                    return json.dumps(parsed[0])
                vectors = [np.array(emb, dtype="float32") for emb in parsed]
                avg_vector = np.mean(vectors, axis=0)
                norm = np.linalg.norm(avg_vector)
                if norm > 0:
                    avg_vector /= norm
                return json.dumps(avg_vector.tolist())
            else:
                return json.dumps(parsed[0])
        else:
            return serialized
    except json.JSONDecodeError:
        return serialized

def best_match(
    probe_vector: str, candidates: Iterable[Tuple[int, str]]
) -> Tuple[Optional[int], float]:
    best_id: Optional[int] = None
    best_score = 0.0
    for candidate_id, candidate_vector in candidates:
        score = cosine_similarity(probe_vector, candidate_vector)
        if score > best_score:
            best_id = candidate_id
            best_score = score
    return best_id, best_score

def get_model_info() -> str:
    """Return the name of the currently active face recognition model."""
    return "ArcFace ResNet50 + YuNet (ONNX)"


