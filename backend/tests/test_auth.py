"""
Tests for authentication: register, login, JWT refresh, profile, API keys.
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import APIKey


@pytest.mark.django_db
class TestRegisterAndLogin:
    def test_register_success(self):
        client = APIClient()
        resp = client.post("/api/auth/register/", {
            "username": "newuser",
            "email": "new@example.com",
            "password": "strongpass1",
            "password_confirm": "strongpass1",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["email"] == "new@example.com"

    def test_register_password_mismatch(self):
        client = APIClient()
        resp = client.post("/api/auth/register/", {
            "username": "u",
            "email": "u@e.com",
            "password": "pass1234",
            "password_confirm": "different",
        }, format="json")
        assert resp.status_code == 400

    def test_login_returns_tokens(self, user):
        client = APIClient()
        resp = client.post("/api/auth/login/", {
            "username": "testuser",
            "password": "testpass123",
        }, format="json")
        assert resp.status_code == 200
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_wrong_password(self, user):
        client = APIClient()
        resp = client.post("/api/auth/login/", {
            "username": "testuser",
            "password": "wrong",
        }, format="json")
        assert resp.status_code == 401

    def test_profile_requires_auth(self):
        client = APIClient()
        resp = client.get("/api/auth/profile/")
        assert resp.status_code == 401

    def test_profile_returns_user(self, client, user):
        resp = client.get("/api/auth/profile/")
        assert resp.status_code == 200
        assert resp.data["username"] == user.username


@pytest.mark.django_db
class TestAPIKeys:
    def test_create_api_key_sandbox(self, client):
        resp = client.post("/api/auth/api-keys/", {
            "name": "My Sandbox Key",
            "environment": "sandbox",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "sandbox"
        assert "raw_key" in resp.data
        assert len(resp.data["raw_key"]) > 20

    def test_create_api_key_production_as_admin(self, admin_client):
        """Admin can create production API keys."""
        resp = admin_client.post("/api/auth/api-keys/", {
            "name": "My Prod Key",
            "environment": "production",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "production"

    def test_developer_cannot_create_production_api_key(self, client):
        """Developer role is blocked from creating production keys."""
        resp = client.post("/api/auth/api-keys/", {
            "name": "My Prod Key",
            "environment": "production",
        }, format="json")
        assert resp.status_code == 403

    def test_create_api_key_invalid_env_rejected(self, client):
        resp = client.post("/api/auth/api-keys/", {
            "name": "Bad Env Key",
            "environment": "staging",
        }, format="json")
        assert resp.status_code == 400

    def test_raw_key_only_shown_once(self, client):
        resp = client.post("/api/auth/api-keys/", {
            "name": "One-time Key",
            "environment": "sandbox",
        }, format="json")
        key_id = resp.data["id"]
        # Fetching the key later should NOT return raw_key
        resp2 = client.get(f"/api/auth/api-keys/{key_id}/")
        assert "raw_key" not in resp2.data

    def test_list_shows_all_environments(self, admin_client, admin_user):
        """Admin can create both env keys and see them all."""
        admin_client.post("/api/auth/api-keys/", {"name": "SB Key", "environment": "sandbox"}, format="json")
        admin_client.post("/api/auth/api-keys/", {"name": "Prod Key", "environment": "production"}, format="json")
        resp = admin_client.get("/api/auth/api-keys/")
        assert resp.status_code == 200
        envs = {k["environment"] for k in resp.data["results"]}
        assert "sandbox" in envs
        assert "production" in envs

    def test_delete_api_key(self, client):
        resp = client.post("/api/auth/api-keys/", {"name": "temp", "environment": "sandbox"}, format="json")
        key_id = resp.data["id"]
        resp2 = client.delete(f"/api/auth/api-keys/{key_id}/")
        assert resp2.status_code == 204
