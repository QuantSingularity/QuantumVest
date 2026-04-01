"""
Authentication Module for QuantumVest
JWT-based authentication with role-based access control
"""

import re
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple

import jwt
from flask import current_app, jsonify, request
from models import User, UserRole, db


class AuthService:
    """Authentication service for user management"""

    @staticmethod
    def generate_token(user_id: Any, expires_in: int = 24) -> str:
        payload = {
            "user_id": str(user_id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=expires_in),
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }
        return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

    @staticmethod
    def generate_refresh_token(user_id: Any, expires_in: int = 168) -> str:
        payload = {
            "user_id": str(user_id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=expires_in),
            "iat": datetime.now(timezone.utc),
            "type": "refresh",
        }
        return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

    @staticmethod
    def verify_token(token: str) -> Any:
        try:
            payload = jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
            return payload["user_id"]
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def validate_email(email: str) -> bool:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return re.match(pattern, email) is not None

    @staticmethod
    def validate_password(password: str) -> Tuple[bool, str]:
        if len(password) < 8:
            return (False, "Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", password):
            return (False, "Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", password):
            return (False, "Password must contain at least one lowercase letter")
        if not re.search(r"\d", password):
            return (False, "Password must contain at least one digit")
        return (True, "Password is valid")

    @staticmethod
    def register_user(
        username: str,
        email: str,
        password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            if not username or len(username) < 3:
                return {
                    "success": False,
                    "error": "Username must be at least 3 characters long",
                }
            if not AuthService.validate_email(email):
                return {"success": False, "error": "Invalid email format"}
            is_valid, message = AuthService.validate_password(password)
            if not is_valid:
                return {"success": False, "error": message}
            if User.query.filter_by(username=username).first():
                return {"success": False, "error": "Username already exists"}
            if User.query.filter_by(email=email).first():
                return {"success": False, "error": "Email already registered"}

            user = User(
                username=username,
                email=email,
                first_name=first_name or "",
                last_name=last_name or "",
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()

            access_token = AuthService.generate_token(user.id)
            refresh_token = AuthService.generate_refresh_token(user.id)
            return {
                "success": True,
                "user": user.to_dict(),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
        except Exception as e:
            db.session.rollback()
            return {"success": False, "error": str(e)}

    @staticmethod
    def login_user(username_or_email: str, password: str) -> Dict[str, Any]:
        try:
            user = User.query.filter(
                (User.username == username_or_email) | (User.email == username_or_email)
            ).first()

            if not user:
                return {"success": False, "error": "Invalid credentials"}

            now = datetime.now(timezone.utc)
            max_attempts = current_app.config.get("MAX_LOGIN_ATTEMPTS", 5)
            lockout_minutes = current_app.config.get("ACCOUNT_LOCKOUT_MINUTES", 30)

            if user.account_locked_until and user.account_locked_until > now:
                remaining = int((user.account_locked_until - now).total_seconds() / 60)
                return {
                    "success": False,
                    "error": f"Account locked. Try again in {remaining} minutes.",
                }

            if not user.check_password(password):
                user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
                if user.failed_login_attempts >= max_attempts:
                    user.account_locked_until = now + timedelta(minutes=lockout_minutes)
                db.session.commit()
                return {"success": False, "error": "Invalid credentials"}

            if not user.is_active:
                return {"success": False, "error": "Account is deactivated"}

            user.last_login = now
            user.failed_login_attempts = 0
            user.account_locked_until = None
            db.session.commit()

            access_token = AuthService.generate_token(user.id)
            refresh_token = AuthService.generate_refresh_token(user.id)
            return {
                "success": True,
                "user": user.to_dict(),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(
                refresh_token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
            if payload.get("type") != "refresh":
                return {"success": False, "error": "Invalid token type"}
            user_id = payload["user_id"]
            user = db.session.get(User, user_id)
            if not user or not user.is_active:
                return {"success": False, "error": "User not found or inactive"}
            access_token = AuthService.generate_token(user.id)
            return {"success": True, "access_token": access_token}
        except jwt.ExpiredSignatureError:
            return {"success": False, "error": "Refresh token expired"}
        except jwt.InvalidTokenError:
            return {"success": False, "error": "Invalid refresh token"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def change_password(
        user_id: str, current_password: str, new_password: str
    ) -> Dict[str, Any]:
        try:
            user = db.session.get(User, user_id)
            if not user:
                return {"success": False, "error": "User not found"}
            if not user.check_password(current_password):
                return {"success": False, "error": "Current password is incorrect"}
            is_valid, message = AuthService.validate_password(new_password)
            if not is_valid:
                return {"success": False, "error": message}
            user.set_password(new_password)
            db.session.commit()
            return {"success": True, "message": "Password changed successfully"}
        except Exception as e:
            db.session.rollback()
            return {"success": False, "error": str(e)}


def token_required(f: Callable) -> Callable:
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return (jsonify({"error": "Invalid token format"}), 401)
        if not token:
            return (jsonify({"error": "Token is missing"}), 401)
        try:
            user_id = AuthService.verify_token(token)
            if not user_id:
                return (jsonify({"error": "Token is invalid or expired"}), 401)
            current_user = db.session.get(User, user_id)
            if not current_user or not current_user.is_active:
                return (jsonify({"error": "User not found or inactive"}), 401)
        except Exception:
            return (jsonify({"error": "Token verification failed"}), 401)
        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f: Callable) -> Callable:
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != UserRole.ADMIN:
            return (jsonify({"error": "Admin privileges required"}), 403)
        return f(current_user, *args, **kwargs)

    return decorated


def premium_required(f: Callable) -> Callable:
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role not in [UserRole.ADMIN, UserRole.PORTFOLIO_MANAGER]:
            return (jsonify({"error": "Premium subscription required"}), 403)
        return f(current_user, *args, **kwargs)

    return decorated


class RateLimiter:
    """Simple in-memory rate limiter"""

    def __init__(self) -> None:
        self.requests: Dict[str, List[datetime]] = {}

    def is_allowed(self, key: str, limit: int, window: int) -> bool:
        now = datetime.now(timezone.utc)
        if key not in self.requests:
            self.requests[key] = []
        self.requests[key] = [
            req_time
            for req_time in self.requests[key]
            if now - req_time < timedelta(seconds=window)
        ]
        if len(self.requests[key]) >= limit:
            return False
        self.requests[key].append(now)
        return True


rate_limiter = RateLimiter()


def rate_limit(limit: int = 100, window: int = 3600) -> Callable:
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            key = request.remote_addr
            if not rate_limiter.is_allowed(key, limit, window):
                return (
                    jsonify(
                        {
                            "error": "Rate limit exceeded",
                            "limit": limit,
                            "window": window,
                        }
                    ),
                    429,
                )
            return f(*args, **kwargs)

        return decorated

    return decorator
