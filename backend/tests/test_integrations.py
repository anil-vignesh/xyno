"""
Tests for SES integrations: CRUD and environment scoping.
"""
import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestIntegrationsEnvironmentScoping:
    def test_sandbox_client_sees_only_sandbox(self, client, sandbox_integration):
        resp = client.get("/api/integrations/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "sandbox"

    def test_prod_admin_client_sees_only_prod(self, prod_admin_client, prod_integration):
        resp = prod_admin_client.get("/api/integrations/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "production"

    def test_developer_locked_to_sandbox(self, prod_client, sandbox_integration):
        """Developer sending X-Environment: production still sees sandbox."""
        resp = prod_client.get("/api/integrations/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "sandbox"

    def test_create_sets_environment_from_header(self, client):
        resp = client.post("/api/integrations/", {
            "name": "Test SES",
            "aws_access_key": "AKIAFAKE",
            "aws_secret_key": "fakesecret",
            "region": "us-east-1",
            "sender_email": "no-reply@example.com",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "sandbox"

    def test_create_prod_sets_environment_from_header(self, prod_admin_client):
        resp = prod_admin_client.post("/api/integrations/", {
            "name": "Prod SES",
            "aws_access_key": "AKIAFAKE",
            "aws_secret_key": "fakesecret",
            "region": "us-east-1",
            "sender_email": "no-reply@example.com",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "production"

    def test_cannot_see_other_users_integrations(self, other_user, sandbox_integration):
        from tests.conftest import env_client
        other_client = env_client(other_user, "sandbox")
        resp = other_client.get("/api/integrations/")
        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_delete_integration(self, client, sandbox_integration):
        resp = client.delete(f"/api/integrations/{sandbox_integration.id}/")
        assert resp.status_code == 204

    def test_unauthenticated_blocked(self):
        resp = APIClient().get("/api/integrations/")
        assert resp.status_code == 401
