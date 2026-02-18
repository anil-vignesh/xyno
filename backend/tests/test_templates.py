"""
Tests for email templates: CRUD, environment scoping, promote action.
"""
import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestTemplatesEnvironmentScoping:
    def test_sandbox_sees_only_sandbox(self, client, sandbox_template, prod_template):
        resp = client.get("/api/templates/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "sandbox"

    def test_prod_sees_only_prod(self, prod_client, sandbox_template, prod_template):
        resp = prod_client.get("/api/templates/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "production"

    def test_create_in_sandbox(self, client):
        resp = client.post("/api/templates/", {
            "name": "New Template",
            "subject": "Hello",
            "html_content": "<p>Hi</p>",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "sandbox"

    def test_create_in_production(self, prod_client):
        resp = prod_client.post("/api/templates/", {
            "name": "Prod Template",
            "subject": "Hello",
            "html_content": "<p>Hi</p>",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "production"

    def test_same_name_allowed_in_different_envs(self, client, prod_client):
        client.post("/api/templates/", {
            "name": "Duplicate Name",
            "subject": "Sub",
            "html_content": "<p>a</p>",
        }, format="json")
        resp = prod_client.post("/api/templates/", {
            "name": "Duplicate Name",
            "subject": "Sub",
            "html_content": "<p>a</p>",
        }, format="json")
        assert resp.status_code == 201

    def test_placeholders_extracted_automatically(self, client):
        resp = client.post("/api/templates/", {
            "name": "Placeholder Template",
            "subject": "Hi {{first_name}}",
            "html_content": "<p>Dear {{first_name}}, your order {{order_id}} is ready.</p>",
        }, format="json")
        assert resp.status_code == 201
        placeholder_names = [p["name"] for p in resp.data["placeholders"]]
        assert "first_name" in placeholder_names
        assert "order_id" in placeholder_names

    def test_cannot_see_other_users_templates(self, other_user, sandbox_template):
        from tests.conftest import env_client
        other_client = env_client(other_user, "sandbox")
        resp = other_client.get("/api/templates/")
        assert resp.data["count"] == 0


@pytest.mark.django_db
class TestTemplatePromote:
    def test_promote_creates_production_copy(self, client, sandbox_template):
        resp = client.post(f"/api/templates/{sandbox_template.id}/promote/")
        assert resp.status_code == 201
        assert resp.data["environment"] == "production"
        assert resp.data["name"] == sandbox_template.name
        assert resp.data["subject"] == sandbox_template.subject

    def test_promote_updates_existing_production_copy(self, client, sandbox_template, prod_template):
        # prod_template already has same name in production
        sandbox_template.subject = "Updated Subject {{name}}"
        sandbox_template.save()
        resp = client.post(f"/api/templates/{sandbox_template.id}/promote/")
        assert resp.status_code == 200
        assert resp.data["subject"] == "Updated Subject {{name}}"
        assert resp.data["environment"] == "production"

    def test_cannot_promote_production_template(self, prod_client, prod_template):
        resp = prod_client.post(f"/api/templates/{prod_template.id}/promote/")
        assert resp.status_code == 400

    def test_promote_copies_placeholders(self, client, sandbox_template):
        resp = client.post(f"/api/templates/{sandbox_template.id}/promote/")
        assert resp.status_code == 201
        placeholder_names = [p["name"] for p in resp.data["placeholders"]]
        assert "name" in placeholder_names


@pytest.mark.django_db
class TestTemplatePreview:
    def test_preview_renders_placeholders(self, client, sandbox_template):
        resp = client.post(f"/api/templates/{sandbox_template.id}/preview/", {
            "context": {"name": "Anil"}
        }, format="json")
        assert resp.status_code == 200
        assert "Anil" in resp.data["html"]
        assert "Anil" in resp.data["subject"]

    def test_preview_uses_defaults_when_no_context(self, client, sandbox_template):
        resp = client.post(f"/api/templates/{sandbox_template.id}/preview/", {
            "context": {}
        }, format="json")
        assert resp.status_code == 200
