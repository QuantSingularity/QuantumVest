"""Integration tests - authentication endpoints."""

import json


class TestRegisterEndpoint:
    def test_register_success(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps(
                {
                    "username": "integ_user",
                    "email": "integ@quantumvest.io",
                    "password": "SecurePass1",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["success"] is True
        assert "access_token" in body
        assert "refresh_token" in body
        assert "user" in body
        assert "password_hash" not in body["user"]

    def test_register_missing_fields(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps({"username": "incomplete"}),
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert resp.get_json()["success"] is False

    def test_register_invalid_email(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps(
                {"username": "user2", "email": "bademail", "password": "SecurePass1"}
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_register_weak_password(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps(
                {"username": "user3", "email": "u3@x.com", "password": "weak"}
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_register_duplicate_username(self, client, test_user):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps(
                {
                    "username": "testuser",
                    "email": "other@x.com",
                    "password": "SecurePass1",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400


class TestLoginEndpoint:
    def test_login_success(self, client, test_user):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "testuser", "password": "TestPassword123"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "access_token" in body

    def test_login_by_email(self, client, test_user):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps(
                {"email": "test@quantumvest.io", "password": "TestPassword123"}
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_login_wrong_password(self, client, test_user):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "testuser", "password": "WrongPass1"}),
            content_type="application/json",
        )
        assert resp.status_code == 401
        assert resp.get_json()["success"] is False

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "ghost", "password": "Pass1234"}),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "testuser"}),
            content_type="application/json",
        )
        assert resp.status_code == 400


class TestProtectedEndpoints:
    def test_profile_without_token(self, client):
        resp = client.get("/api/v1/auth/profile")
        assert resp.status_code == 401

    def test_profile_with_valid_token(self, client, auth_headers):
        resp = client.get("/api/v1/auth/profile", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "user" in body

    def test_profile_with_invalid_token(self, client):
        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401

    def test_update_profile(self, client, auth_headers):
        resp = client.put(
            "/api/v1/auth/profile",
            data=json.dumps({"first_name": "Updated"}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["first_name"] == "Updated"

    def test_logout(self, client, auth_headers):
        resp = client.post("/api/v1/auth/logout", headers=auth_headers)
        assert resp.status_code == 200


class TestTokenRefresh:
    def test_refresh_token(self, client, test_user, app):
        with app.app_context():
            from app.core.auth import AuthService

            refresh = AuthService.generate_refresh_token(test_user.id)

        resp = client.post(
            "/api/v1/auth/refresh",
            data=json.dumps({"refresh_token": refresh}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "access_token" in body

    def test_refresh_missing_token(self, client):
        resp = client.post(
            "/api/v1/auth/refresh",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_refresh_invalid_token(self, client):
        resp = client.post(
            "/api/v1/auth/refresh",
            data=json.dumps({"refresh_token": "bad.token"}),
            content_type="application/json",
        )
        assert resp.status_code == 401


class TestForgotPassword:
    def test_forgot_password_known_email(self, client, test_user):
        resp = client.post(
            "/api/v1/auth/forgot-password",
            data=json.dumps({"email": test_user.email}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.get_json()["success"] is True

    def test_forgot_password_unknown_email_same_response(self, client):
        """Must not reveal whether an email is registered."""
        resp = client.post(
            "/api/v1/auth/forgot-password",
            data=json.dumps({"email": "nobody@quantumvest.io"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.get_json()["success"] is True

    def test_forgot_password_missing_email(self, client):
        resp = client.post(
            "/api/v1/auth/forgot-password",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert resp.status_code == 400


class TestResetPassword:
    def test_reset_password_success(self, client, test_user, app):
        with app.app_context():
            from app.core.auth import AuthService

            token = AuthService.generate_reset_token(test_user.id)

        resp = client.post(
            "/api/v1/auth/reset-password",
            data=json.dumps({"token": token, "new_password": "NewSecurePass1"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.get_json()["success"] is True

        login_resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps(
                {"username": test_user.username, "password": "NewSecurePass1"}
            ),
            content_type="application/json",
        )
        assert login_resp.status_code == 200

    def test_reset_password_invalid_token(self, client):
        resp = client.post(
            "/api/v1/auth/reset-password",
            data=json.dumps({"token": "garbage", "new_password": "NewSecurePass1"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_reset_password_weak_password(self, client, test_user, app):
        with app.app_context():
            from app.core.auth import AuthService

            token = AuthService.generate_reset_token(test_user.id)

        resp = client.post(
            "/api/v1/auth/reset-password",
            data=json.dumps({"token": token, "new_password": "weak"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_reset_password_missing_fields(self, client):
        resp = client.post(
            "/api/v1/auth/reset-password",
            data=json.dumps({"token": "x"}),
            content_type="application/json",
        )
        assert resp.status_code == 400
