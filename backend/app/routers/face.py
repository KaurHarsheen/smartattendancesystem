import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..auth import get_current_user
from ..database import get_session
from ..face_service import extract_embedding, serialize_embeddings
from ..models import FaceEmbedding, User, FaceUpdateRequest
from ..schemas import FaceCaptureRequest, FaceEnrollmentStatus

router = APIRouter(prefix="/faces", tags=["Face"])


@router.get("/model-info")
def get_face_model_info(
    current_user: User = Depends(get_current_user),
):
    from ..face_service import get_model_info
    return {"model": get_model_info()}


@router.get("/me", response_model=FaceEnrollmentStatus)
def get_enrollment_status(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    existing = session.exec(select(FaceEmbedding).where(FaceEmbedding.user_id == current_user.id)).first()
    sample_count = 0
    if existing and existing.vector:
        try:
            parsed = json.loads(existing.vector)
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], list):
                sample_count = len(parsed)
            elif isinstance(parsed, list):
                sample_count = 1
            else:
                sample_count = 1
        except json.JSONDecodeError:
            sample_count = 0
    return FaceEnrollmentStatus(enrolled=sample_count >= 3, samples=sample_count)


@router.post("/capture")
def capture_face(
    payload: FaceCaptureRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    images: List[str] = []
    if payload.images:
        images = payload.images
    elif payload.image_data:
        images = [payload.image_data]
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least one image")

    try:
        embeddings = [extract_embedding(image) for image in images]
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    existing = session.exec(select(FaceEmbedding).where(FaceEmbedding.user_id == current_user.id)).first()
    
    # Check for pending requests
    pending = session.exec(select(FaceUpdateRequest).where(
        FaceUpdateRequest.user_id == current_user.id, 
        FaceUpdateRequest.status == "PENDING"
    )).first()
    
    if pending:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have a pending face update request.")

    if existing:
        # User already has a face enrolled. Create an update request.
        # We'll use the new embeddings. For simplicity, we replace the old ones in the request.
        # In a real scenario, you might want to merge or select best. 
        # Here we just take the new ones as the proposed "new face".
        new_vector = serialize_embeddings(embeddings[:3])
        
        # Use the first image as the preview for admin
        preview_image = images[0] if images else ""
        
        request = FaceUpdateRequest(
            user_id=current_user.id,
            vector=new_vector,
            image_data=preview_image,
            status="PENDING"
        )
        session.add(request)
        session.commit()
        return {"message": "Face update request submitted for approval.", "samples": 0, "status": "PENDING"}
    else:
        # First time enrollment - Auto approve
        stored = serialize_embeddings(embeddings[:3])
        session.add(FaceEmbedding(user_id=current_user.id, vector=stored))
        sample_count = min(3, len(embeddings))
        session.commit()
        return {"message": f"Stored {sample_count} face sample(s)", "samples": sample_count, "status": "APPROVED"}


