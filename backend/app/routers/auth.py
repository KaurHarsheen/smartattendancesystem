from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..config import get_settings
from ..credential_store import record_credentials
from ..crud import ensure_role_login_entry
from ..database import get_session
from ..models import RoleEnum, User
from ..schemas import ChangePasswordRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    role_hint: Optional[RoleEnum] = None
    if form_data.scopes:
        scope_value = form_data.scopes[0].upper()
        try:
            role_hint = RoleEnum(scope_value)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role selection") from exc
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if role_hint and user.role != role_hint:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role mismatch for credentials")
    login_entry = ensure_role_login_entry(session, user)
    if not verify_password(form_data.password, login_entry.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    login_entry.last_login_at = datetime.utcnow()
    session.add(login_entry)
    session.commit()
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    token = create_access_token(user.email, user.role, access_token_expires)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        must_change_password=user.must_change_password,
        full_name=user.full_name,
    )


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    session.add(current_user)
    ensure_role_login_entry(session, current_user)
    session.commit()
    record_credentials(
        email=current_user.email,
        role=current_user.role.value,
        full_name=current_user.full_name,
        plain_password=payload.new_password,
    )
    return {"message": "Password updated"}


