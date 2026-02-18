"""
Tests for events: CRUD, environment scoping, promote action,
and the external TriggerEventView (API key scoping).
"""
import pytest
from unittest.mock import patch
from rest_framework.test import APIClient

from events.models import Event
from templates_app.models import EmailTemplate
from integrations.models import SESIntegration


@pytest.mark.django_db
class TestEventsEnvironmentScoping:
    def test_sandbox_sees_only_sandbox(self, client, sandbox_event):
        resp = client.get("/api/events/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "sandbox"

    def test_prod_admin_sees_only_prod(self, prod_admin_client, prod_event):
        resp = prod_admin_client.get("/api/events/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "production"

    def test_developer_locked_to_sandbox(self, prod_client, sandbox_event):
        """Developer sending X-Environment: production still sees sandbox."""
        resp = prod_client.get("/api/events/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["environment"] == "sandbox"

    def test_create_event_in_sandbox(self, client, sandbox_template, sandbox_integration):
        resp = client.post("/api/events/", {
            "name": "New Event",
            "description": "",
            "template": sandbox_template.id,
            "integration": sandbox_integration.id,
            "is_active": True,
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["environment"] == "sandbox"

    def test_same_slug_allowed_in_different_envs(self, sandbox_event, prod_event):
        # Both fixtures share slug "payment_received" but different envs — no constraint error
        assert sandbox_event.slug == prod_event.slug
        assert sandbox_event.environment != prod_event.environment

    def test_cannot_see_other_users_events(self, other_user, sandbox_event):
        from tests.conftest import env_client
        other_client = env_client(other_user, "sandbox")
        resp = other_client.get("/api/events/")
        assert resp.data["count"] == 0


@pytest.mark.django_db
class TestEventPromote:
    def test_promote_creates_production_event(self, admin_client, admin_user, prod_template, prod_integration):
        """Admin can promote a sandbox event to production."""
        # Create sandbox template + integration owned by admin_user
        sb_int = SESIntegration(
            name="SB Integration",
            user=admin_user,
            environment="sandbox",
            region="us-east-1",
            sender_email="sender@example.com",
            is_verified=True,
            is_active=True,
        )
        sb_int.set_aws_credentials("AKIATEST", "secrettest")
        sb_int.save()
        sb_tpl = EmailTemplate.objects.create(
            name="Welcome Email",
            subject="Hello",
            html_content="<p>Hi</p>",
            user=admin_user,
            environment="sandbox",
        )
        event = Event.objects.create(
            name="Payment Received",
            slug="payment_received_promote",
            user=admin_user,
            template=sb_tpl,
            integration=sb_int,
            environment="sandbox",
            is_active=True,
        )
        resp = admin_client.post(f"/api/events/{event.id}/promote/")
        assert resp.status_code in (200, 201)
        assert resp.data["environment"] == "production"
        assert resp.data["slug"] == event.slug

    def test_promote_warns_if_template_not_in_production(self, client, user, sandbox_integration):
        # Template only in sandbox, no production counterpart
        tpl = EmailTemplate.objects.create(
            name="Orphan Template",
            subject="Hi",
            html_content="<p>hi</p>",
            user=user,
            environment="sandbox",
        )
        event = Event.objects.create(
            name="Orphan Event",
            slug="orphan_event",
            user=user,
            template=tpl,
            integration=sandbox_integration,
            environment="sandbox",
            is_active=True,
        )
        resp = client.post(f"/api/events/{event.id}/promote/")
        assert resp.status_code in (200, 201)
        assert len(resp.data["warnings"]) > 0
        assert "Orphan Template" in resp.data["warnings"][0]

    def test_promote_warns_if_integration_not_in_production(self, client, user, sandbox_template):
        # Integration only in sandbox
        i = SESIntegration(
            name="Orphan Integration",
            user=user,
            environment="sandbox",
            region="us-east-1",
            sender_email="x@x.com",
        )
        i.set_aws_credentials("A", "B")
        i.save()
        event = Event.objects.create(
            name="Int Orphan Event",
            slug="int_orphan_event",
            user=user,
            template=sandbox_template,
            integration=i,
            environment="sandbox",
            is_active=True,
        )
        resp = client.post(f"/api/events/{event.id}/promote/")
        assert resp.status_code in (200, 201)
        assert any("Orphan Integration" in w for w in resp.data["warnings"])

    def test_cannot_promote_production_event(self, prod_admin_client, prod_event):
        resp = prod_admin_client.post(f"/api/events/{prod_event.id}/promote/")
        assert resp.status_code == 400

    def test_promote_updates_existing(self, admin_client, admin_user, prod_template, prod_integration):
        """Promoting an event that already exists in production updates it (200)."""
        sb_int = SESIntegration(
            name="SB Integration",
            user=admin_user,
            environment="sandbox",
            region="us-east-1",
            sender_email="sender@example.com",
            is_verified=True,
            is_active=True,
        )
        sb_int.set_aws_credentials("AKIATEST", "secrettest")
        sb_int.save()
        sb_tpl = EmailTemplate.objects.create(
            name="Welcome Email",
            subject="Hello",
            html_content="<p>Hi</p>",
            user=admin_user,
            environment="sandbox",
        )
        sb_event = Event.objects.create(
            name="Payment Received",
            slug="payment_received_update",
            user=admin_user,
            template=sb_tpl,
            integration=sb_int,
            environment="sandbox",
            is_active=True,
        )
        # First promote → creates production event (201)
        admin_client.post(f"/api/events/{sb_event.id}/promote/")
        # Update + promote again → updates existing (200)
        sb_event.name = "Updated Name"
        sb_event.save()
        resp = admin_client.post(f"/api/events/{sb_event.id}/promote/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Updated Name"


@pytest.mark.django_db
class TestTriggerEventView:
    def test_sandbox_key_triggers_sandbox_event(self, sandbox_event, sandbox_api_key):
        with patch("events.tasks.send_event_email.delay") as mock_task:
            mock_task.return_value.id = "fake-task-id"
            client = APIClient()
            resp = client.post("/api/events/trigger/", {
                "event": sandbox_event.slug,
                "recipient": "test@example.com",
                "data": {"name": "Anil"},
            }, format="json", HTTP_X_API_KEY=sandbox_api_key)
        assert resp.status_code == 202
        assert resp.data["environment"] == "sandbox"
        mock_task.assert_called_once_with(
            event_id=sandbox_event.id,
            recipient="test@example.com",
            context_data={"name": "Anil"},
        )

    def test_prod_key_cannot_trigger_sandbox_event(self, sandbox_event, prod_api_key):
        client = APIClient()
        resp = client.post("/api/events/trigger/", {
            "event": sandbox_event.slug,
            "recipient": "test@example.com",
            "data": {},
        }, format="json", HTTP_X_API_KEY=prod_api_key)
        assert resp.status_code == 404

    def test_sandbox_key_cannot_trigger_prod_event(self, prod_event, sandbox_api_key):
        client = APIClient()
        resp = client.post("/api/events/trigger/", {
            "event": prod_event.slug,
            "recipient": "test@example.com",
            "data": {},
        }, format="json", HTTP_X_API_KEY=sandbox_api_key)
        assert resp.status_code == 404

    def test_invalid_api_key_rejected(self, sandbox_event):
        client = APIClient()
        resp = client.post("/api/events/trigger/", {
            "event": sandbox_event.slug,
            "recipient": "test@example.com",
            "data": {},
        }, format="json", HTTP_X_API_KEY="invalid-key-xyz")
        assert resp.status_code == 401

    def test_inactive_event_not_triggered(self, user, sandbox_template, sandbox_integration, sandbox_api_key):
        event = Event.objects.create(
            name="Inactive Event",
            slug="inactive_event",
            user=user,
            template=sandbox_template,
            integration=sandbox_integration,
            environment="sandbox",
            is_active=False,
        )
        client = APIClient()
        resp = client.post("/api/events/trigger/", {
            "event": event.slug,
            "recipient": "test@example.com",
            "data": {},
        }, format="json", HTTP_X_API_KEY=sandbox_api_key)
        assert resp.status_code == 404

    def test_trigger_requires_api_key(self, sandbox_event):
        client = APIClient()
        resp = client.post("/api/events/trigger/", {
            "event": sandbox_event.slug,
            "recipient": "test@example.com",
            "data": {},
        }, format="json")
        assert resp.status_code == 401
