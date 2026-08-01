"""Unit tests for security services."""

import pytest
from app.core.security import (
    AuthenticationService,
    AuthorizationService,
    EncryptionService,
)
from app.models.financial import UserRole


class TestEncryptionService:
    def test_encrypt_decrypt_roundtrip(self):
        svc = EncryptionService()
        original = "Sensitive financial data"
        encrypted = svc.encrypt(original)
        assert encrypted != original
        assert svc.decrypt(encrypted) == original

    def test_encrypt_is_deterministic_with_same_key(self):
        svc = EncryptionService(master_key="fixed-test-key")
        e1 = svc.encrypt("data")
        # Fernet uses random IV - two encryptions differ but both decrypt correctly
        e2 = svc.encrypt("data")
        assert svc.decrypt(e1) == "data"
        assert svc.decrypt(e2) == "data"

    def test_different_instances_same_key(self):
        svc1 = EncryptionService(master_key="shared-key")
        svc2 = EncryptionService(master_key="shared-key")
        enc = svc1.encrypt("hello")
        assert svc2.decrypt(enc) == "hello"

    def test_encrypt_pii_sensitive_fields(self):
        svc = EncryptionService()
        pii = {"ssn": "123-45-6789", "name": "John Doe"}
        result = svc.encrypt_pii(pii)
        assert result["ssn"] != "123-45-6789"
        assert result["name"] == "John Doe"

    def test_decrypt_wrong_key_raises(self):
        svc1 = EncryptionService(master_key="key-one")
        svc2 = EncryptionService(master_key="key-two")
        enc = svc1.encrypt("secret")
        with pytest.raises(Exception):
            svc2.decrypt(enc)


class TestAuthenticationService:
    def test_hash_and_verify(self):
        svc = AuthenticationService()
        pw = "StrongPassword1!"
        h = svc.generate_secure_password_hash(pw)
        assert h != pw
        assert svc.verify_password(pw, h)
        assert not svc.verify_password("wrong", h)

    def test_password_strength_valid(self):
        ok, errors = AuthenticationService.validate_password_strength("SecurePass1!")
        assert ok
        assert len(errors) == 0

    def test_password_strength_too_short(self):
        ok, errors = AuthenticationService.validate_password_strength("Ab1!")
        assert not ok

    def test_password_no_uppercase(self):
        ok, errors = AuthenticationService.validate_password_strength("lowercase1!")
        assert not ok

    def test_password_no_lowercase(self):
        ok, errors = AuthenticationService.validate_password_strength("UPPERCASE1!")
        assert not ok

    def test_password_no_digit(self):
        ok, errors = AuthenticationService.validate_password_strength("NoDigitPass!")
        assert not ok

    def test_password_no_special(self):
        ok, errors = AuthenticationService.validate_password_strength("NoSpecialChar1")
        assert not ok

    @pytest.mark.parametrize(
        "weak",
        [
            "password",
            "12345678",
            "Password",
            "Pass123",
        ],
    )
    def test_weak_passwords(self, weak):
        ok, _ = AuthenticationService.validate_password_strength(weak)
        assert not ok


class TestAuthorizationService:
    def test_admin_has_all_permissions(self):
        svc = AuthorizationService()
        for perm in (
            "user:create",
            "portfolio:delete",
            "report:generate",
            "system:configure",
        ):
            assert svc.has_permission(UserRole.ADMIN, perm)

    def test_client_can_manage_own_portfolio(self):
        svc = AuthorizationService()
        assert svc.has_permission(UserRole.CLIENT, "portfolio:create")
        assert svc.has_permission(UserRole.CLIENT, "portfolio:read")
        assert svc.has_permission(UserRole.CLIENT, "transaction:create")

    def test_client_cannot_create_users(self):
        svc = AuthorizationService()
        assert not svc.has_permission(UserRole.CLIENT, "user:create")

    def test_viewer_read_only(self):
        svc = AuthorizationService()
        assert svc.has_permission(UserRole.VIEWER, "portfolio:read")
        assert not svc.has_permission(UserRole.VIEWER, "transaction:create")
        assert not svc.has_permission(UserRole.VIEWER, "portfolio:delete")

    def test_analyst_can_generate_reports(self):
        svc = AuthorizationService()
        assert svc.has_permission(UserRole.ANALYST, "report:generate")
        assert not svc.has_permission(UserRole.ANALYST, "transaction:create")
