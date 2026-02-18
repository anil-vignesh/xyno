"""
Tests for email templates: CRUD, environment scoping, promote action.
"""
import pytest
from rest_framework.test import APIClient
from templates_app.models import EmailTemplate


@pytest.mark.django_db
class TestTemplatesEnvironmentScoping:
    def test_sandbox_sees_only_sandbox(self, client, sandbox_template):
        resp = client.get("/api/templates/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "sandbox"

    def test_prod_admin_sees_only_prod(self, prod_admin_client, prod_template):
        resp = prod_admin_client.get("/api/templates/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "production"

    def test_developer_locked_to_sandbox(self, prod_client, sandbox_template):
        """Developer sending X-Environment: production still sees sandbox."""
        resp = prod_client.get("/api/templates/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "sandbox"

    def test_create_in_sandbox(self, client):
        resp = client.post("/api/templates/", {
            "name": "New Template",
            "subject": "Hello",
            "html_content": "<p>Hi</p>",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "sandbox"

    def test_create_in_production(self, prod_admin_client):
        resp = prod_admin_client.post("/api/templates/", {
            "name": "Prod Template",
            "subject": "Hello",
            "html_content": "<p>Hi</p>",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "production"

    def test_same_name_allowed_in_different_envs(self, client, prod_admin_client):
        client.post("/api/templates/", {
            "name": "Duplicate Name",
            "subject": "Sub",
            "html_content": "<p>a</p>",
        }, format="json")
        resp = prod_admin_client.post("/api/templates/", {
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
    def test_promote_creates_production_copy(self, admin_client, admin_user):
        """Admin can promote a sandbox template to production."""
        tpl = EmailTemplate.objects.create(
            name="Promo Template",
            subject="Hello {{name}}",
            html_content="<p>Hi {{name}}, welcome!</p>",
            user=admin_user,
            environment="sandbox",
        )
        resp = admin_client.post(f"/api/templates/{tpl.id}/promote/")
        assert resp.status_code == 201
        assert resp.data["environment"] == "production"
        assert resp.data["name"] == tpl.name
        assert resp.data["subject"] == tpl.subject

    def test_promote_updates_existing_production_copy(self, admin_client, admin_user):
        """Promote with existing production copy returns 200 and updates it."""
        tpl_sb = EmailTemplate.objects.create(
            name="Update Me",
            subject="Old Subject",
            html_content="<p>old</p>",
            user=admin_user,
            environment="sandbox",
        )
        EmailTemplate.objects.create(
            name="Update Me",
            subject="Old Subject",
            html_content="<p>old</p>",
            user=admin_user,
            environment="production",
        )
        tpl_sb.subject = "Updated Subject {{name}}"
        tpl_sb.save()
        resp = admin_client.post(f"/api/templates/{tpl_sb.id}/promote/")
        assert resp.status_code == 200
        assert resp.data["subject"] == "Updated Subject {{name}}"
        assert resp.data["environment"] == "production"

    def test_cannot_promote_production_template(self, prod_admin_client, prod_template):
        resp = prod_admin_client.post(f"/api/templates/{prod_template.id}/promote/")
        assert resp.status_code == 400

    def test_promote_copies_placeholders(self, admin_client, admin_user):
        tpl = EmailTemplate.objects.create(
            name="Placeholder Promo",
            subject="Hi {{name}}",
            html_content="<p>Hi {{name}}</p>",
            user=admin_user,
            environment="sandbox",
        )
        resp = admin_client.post(f"/api/templates/{tpl.id}/promote/")
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
