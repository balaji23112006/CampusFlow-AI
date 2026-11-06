import re
import hmac
import hashlib
import os
import jwt
from typing import Optional, Tuple
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from app.core.config import settings

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "campusflow-super-secret-production-jwt-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def validate_email_format(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if "@" not in email or email.count("@") != 1:
        return False
    if email.startswith("@") or email.endswith("@"):
        return False
    if " " in email:
        return False
    return bool(EMAIL_REGEX.match(email))


def validate_password_complexity(password: str) -> Tuple[bool, str]:
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        return False, "Password must contain at least one special character."
    return True, "Password meets complexity requirements."


def validate_srmap_roll_number(roll_number: str, admission_year: Optional[int] = None) -> Tuple[bool, str]:
    """
    Validates SRM University-AP style roll numbers.
    Expected format: AP + YY + student_identifier_digits (e.g. AP24110012146 for admission year 2024).
    """
    if not roll_number or not isinstance(roll_number, str):
        return False, "Roll number cannot be empty."

    clean_roll = roll_number.strip().upper()
    pattern = r"^AP(\d{2})\d{6,12}$"
    match = re.match(pattern, clean_roll)

    if not match:
        return False, f"Invalid roll number format '{roll_number}'. Expected university format AP{{YY}}xxxxxxxx (e.g., AP24110012146)."

    extracted_yy = match.group(1)

    if admission_year is not None:
        expected_yy = str(admission_year)[-2:]
        if extracted_yy != expected_yy:
            return False, f"Roll number year prefix '{extracted_yy}' does not match admission year {admission_year} (expected prefix 'AP{expected_yy}')."

    return True, "Valid roll number format."


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    iterations = 100000
    derived = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        bytes.fromhex(salt),
        iterations
    )
    return f"pbkdf2:sha256:{iterations}${salt}${derived.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        parts = password_hash.split("$")
        if len(parts) != 3:
            return False
        algo_info, salt_hex, hash_hex = parts
        _, algo_name, iter_str = algo_info.split(":")
        iterations = int(iter_str)
        derived = hashlib.pbkdf2_hmac(
            algo_name,
            password.encode('utf-8'),
            bytes.fromhex(salt_hex),
            iterations
        )
        return hmac.compare_digest(derived.hex(), hash_hex)
    except Exception:
        return False


def create_jwt_token(user_id: str, email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token signature."
        )
