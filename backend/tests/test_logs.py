"""
Tests for email logs and dashboard stats — environment scoping.
"""
import pytest
from logs.models import EmailLog


def make_log(user, environment, status="sent", **kwargs):
    return EmailLog.objects.create(
        user=user,
        environment=environment,
        recipient="r@example.com",
        subject="Test Subject",
        status=status,
        **kwargs,
    )


@pytest.mark.django_db
class TestLogsEnvironmentScoping:
    def test_sandbox_logs_only(self, client, user):
        make_log(user, "sandbox")
        make_log(user, "production")
        resp = client.get("/api/logs/")
        assert resp.status_code == 200
        for log in resp.data["results"]:
            assert log["environment"] == "sandbox"

    def test_prod_admin_logs_only(self, prod_admin_client, admin_user):
        make_log(admin_user, "sandbox")
        make_log(admin_user, "production")
        resp = prod_admin_client.get("/api/logs/")
        assert resp.status_code == 200
        for log in resp.data["results"]:
            assert log["environment"] == "production"

    def test_developer_locked_to_sandbox_logs(self, prod_client, user):
        """Developer sending X-Environment: production still sees sandbox logs."""
        make_log(user, "sandbox")
        make_log(user, "production")
        resp = prod_client.get("/api/logs/")
        assert resp.status_code == 200
        for log in resp.data["results"]:
            assert log["environment"] == "sandbox"

    def test_log_has_environment_field(self, client, user):
        make_log(user, "sandbox")
        resp = client.get("/api/logs/")
        assert "environment" in resp.data["results"][0]

    def test_cannot_see_other_users_logs(self, other_user, client, user):
        make_log(user, "sandbox")
        make_log(other_user, "sandbox")
        resp = client.get("/api/logs/")
        assert resp.data["count"] == 1

    def test_unauthenticated_blocked(self):
        from rest_framework.test import APIClient
        resp = APIClient().get("/api/logs/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestDashboardStats:
    def test_stats_scoped_to_environment(self, admin_client, prod_admin_client, admin_user,
                                          sandbox_event, prod_event):
        # 2 sandbox logs, 1 prod log — all belonging to admin_user (who owns both events)
        make_log(admin_user, "sandbox", status="sent", event=sandbox_event)
        make_log(admin_user, "sandbox", status="failed", event=sandbox_event)
        make_log(admin_user, "production", status="sent", event=prod_event)

        sb_resp = admin_client.get("/api/logs/dashboard-stats/")
        assert sb_resp.status_code == 200
        assert sb_resp.data["total_sent"] == 1
        assert sb_resp.data["total_failed"] == 1

        prod_resp = prod_admin_client.get("/api/logs/dashboard-stats/")
        assert prod_resp.data["total_sent"] == 1
        assert prod_resp.data["total_failed"] == 0

    def test_stats_counts_correct_env_resources(self, admin_client, sandbox_event, prod_event,
                                                  sandbox_template, prod_template,
                                                  sandbox_integration, prod_integration):
        # sandbox_event belongs to user (developer), prod_event belongs to admin_user
        # admin_client is for admin_user, which owns prod resources
        # sandbox resources that admin_client sees: those belonging to admin_user
        resp = admin_client.get("/api/logs/dashboard-stats/")
        assert resp.status_code == 200
        # user and admin_user share the same org, so admin_client sees org-wide sandbox resources.
        # sandbox_event belongs to user (same org), so admin sees 1 active sandbox event.
        assert resp.data["active_events"] == 1

    def test_stats_unauthenticated(self):
        from rest_framework.test import APIClient
        resp = APIClient().get("/api/logs/dashboard-stats/")
        assert resp.status_code == 401
