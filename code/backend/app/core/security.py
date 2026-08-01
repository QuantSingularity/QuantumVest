"""
Security services: encryption, RBAC authorization, audit logging, threat detection.
"""

import base64
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import bcrypt
import jwt
from app.extensions import db
from app.models.financial import AuditLog, User, UserRole
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from flask import current_app

logger = logging.getLogger(__name__)


class EncryptionService:
    """Field-level encryption for PII and sensitive financial data."""

    def __init__(self, master_key: Optional[str] = None) -> None:
        raw = master_key.encode() if master_key else secrets.token_bytes(32)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"quantumvest_salt_v1",
            iterations=100_000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(raw))
        self._cipher = Fernet(key)

    def encrypt(self, data: str) -> str:
        try:
            return base64.urlsafe_b64encode(
                self._cipher.encrypt(data.encode())
            ).decode()
        except Exception as exc:
            logger.error("Encryption error: %s", exc)
            raise

    def decrypt(self, encrypted: str) -> str:
        try:
            raw = base64.urlsafe_b64decode(encrypted.encode())
            return self._cipher.decrypt(raw).decode()
        except Exception as exc:
            logger.error("Decryption error: %s", exc)
            raise

    def encrypt_pii(self, pii_data: Dict[str, Any]) -> Dict[str, Any]:
        sensitive = {"ssn", "tax_id", "bank_account", "credit_card", "passport"}
        return {
            k: (self.encrypt(str(v)) if k.lower() in sensitive and v else v)
            for k, v in pii_data.items()
        }


class AuthenticationService:
    """Multi-factor-capable authentication helpers."""

    @staticmethod
    def generate_secure_password_hash(password: str) -> str:
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"), password_hash.encode("utf-8")
            )
        except Exception:
            return False

    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
        import re

        errors: List[str] = []
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        if not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        return (len(errors) == 0, errors)

    @staticmethod
    def generate_jwt_token(user: User, expires_in: int = 3600) -> str:
        payload = {
            "user_id": str(user.id),
            "role": user.role.value,
            "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

    @staticmethod
    def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            return jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

    @staticmethod
    def generate_2fa_secret() -> str:
        try:
            import pyotp

            return pyotp.random_base32()
        except ImportError:
            return secrets.token_hex(20)

    @staticmethod
    def verify_2fa_token(secret: str, token: str) -> bool:
        try:
            import pyotp

            totp = pyotp.TOTP(secret)
            return totp.verify(token)
        except ImportError:
            return False


# ---------------------------------------------------------------------------
# Role-based access control
# ---------------------------------------------------------------------------

_PERMISSIONS: Dict[UserRole, Set[str]] = {
    UserRole.ADMIN: {
        "user:create",
        "user:read",
        "user:update",
        "user:delete",
        "portfolio:create",
        "portfolio:read",
        "portfolio:update",
        "portfolio:delete",
        "transaction:create",
        "transaction:read",
        "report:generate",
        "system:configure",
    },
    UserRole.PORTFOLIO_MANAGER: {
        "portfolio:create",
        "portfolio:read",
        "portfolio:update",
        "transaction:create",
        "transaction:read",
        "report:generate",
        "user:read",
    },
    UserRole.ANALYST: {
        "portfolio:read",
        "transaction:read",
        "report:generate",
    },
    UserRole.CLIENT: {
        "portfolio:create",
        "portfolio:read",
        "portfolio:update",
        "transaction:create",
        "transaction:read",
    },
    UserRole.VIEWER: {
        "portfolio:read",
        "transaction:read",
    },
}


class AuthorizationService:
    """RBAC - check permissions and resource ownership."""

    @staticmethod
    def has_permission(user_role: UserRole, permission: str) -> bool:
        return permission in _PERMISSIONS.get(user_role, set())

    @staticmethod
    def get_permissions(user_role: UserRole) -> Set[str]:
        return _PERMISSIONS.get(user_role, set())

    @staticmethod
    def check_resource_access(user: User, resource_type: str, resource_id: str) -> bool:
        if user.role == UserRole.ADMIN:
            return True
        if resource_type == "portfolio":
            from app.models.financial import Portfolio

            portfolio = db.session.get(Portfolio, resource_id)
            return portfolio is not None and str(portfolio.user_id) == str(user.id)
        return False


class AuditService:
    """Immutable audit trail for all security-relevant events."""

    @staticmethod
    def log_event(
        event_type: str,
        description: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        try:
            log = AuditLog(
                user_id=user_id,
                event_type=event_type,
                event_description=description,
                ip_address=ip_address,
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                meta_data=meta,
            )
            db.session.add(log)
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            logger.error("Failed to write audit log: %s", exc)

    @staticmethod
    def log_authentication_event(
        user_id: Optional[str],
        event_type: str,
        success: bool,
        ip_address: Optional[str] = None,
    ) -> None:
        description = (
            f"Authentication {'successful' if success else 'failed'}: {event_type}"
        )
        AuditService.log_event(
            event_type=event_type,
            description=description,
            user_id=user_id,
            ip_address=ip_address,
            status_code=200 if success else 401,
        )


class ThreatDetectionService:
    """Brute-force and anomaly detection."""

    def __init__(self) -> None:
        self._failed_attempts: Dict[str, List[datetime]] = {}
        self._login_history: Dict[str, List[datetime]] = {}

    def detect_brute_force(
        self, ip_address: str, window_seconds: int = 300, threshold: int = 10
    ) -> bool:
        now = datetime.now(timezone.utc)
        attempts = self._failed_attempts.get(ip_address, [])
        attempts = [t for t in attempts if (now - t).seconds < window_seconds]
        self._failed_attempts[ip_address] = attempts
        return len(attempts) >= threshold

    def record_failed_attempt(self, ip_address: str) -> None:
        now = datetime.now(timezone.utc)
        self._failed_attempts.setdefault(ip_address, []).append(now)
