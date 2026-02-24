"""
Shared fixtures for all tests.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.models import APIKey, Organization
from integrations.models import SESIntegration
from templates_app.models import EmailTemplate
from events.models import Event

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def auth_client(user):
    """Return an APIClient pre-authenticated as *user* via JWT."""
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


def env_client(user, environment="sandbox"):
    """Auth client that also sends X-Environment header."""
    client = auth_client(user)
    client.credentials(
        HTTP_AUTHORIZATION=client._credentials["HTTP_AUTHORIZATION"],
        HTTP_X_ENVIRONMENT=environment,
    )
    return client


# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------

@pytest.fixture
def org(db):
    org, _ = Organization.objects.get_or_create(name="Test Org")
    return org


@pytest.fixture
def other_org(db):
    org, _ = Organization.objects.get_or_create(name="Other Org")
    return org


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db, org):
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        role="developer",
        organization=org,
    )


@pytest.fixture
def other_user(db, other_org):
    """A user in a *different* org — used for cross-org isolation tests."""
    return User.objects.create_user(
        username="other",
        email="other@example.com",
        password="otherpass123",
        role="developer",
        organization=other_org,
    )


@pytest.fixture
def admin_user(db, org):
    return User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="adminpass123",
        role="admin",
        organization=org,
    )


@pytest.fixture
def client(user):
    return env_client(user, "sandbox")


@pytest.fixture
def prod_client(user):
    # Developer users are locked to sandbox by get_environment_from_request;
    # use prod_admin_client for tests that need real production access.
    return env_client(user, "production")


@pytest.fixture
def admin_client(admin_user):
    return env_client(admin_user, "sandbox")


@pytest.fixture
def prod_admin_client(admin_user):
    return env_client(admin_user, "production")


# ---------------------------------------------------------------------------
# Integrations
# ---------------------------------------------------------------------------

@pytest.fixture
def sandbox_integration(user):
    i = SESIntegration(
        name="SB Integration",
        user=user,
        environment="sandbox",
        region="us-east-1",
        sender_email="sender@example.com",
        is_verified=True,
        is_active=True,
    )
    i.set_aws_credentials("AKIATEST", "secrettest")
    i.save()
    return i


@pytest.fixture
def prod_integration(admin_user):
    i = SESIntegration(
        name="SB Integration",
        user=admin_user,
        environment="production",
        region="us-east-1",
        sender_email="sender@example.com",
        is_verified=True,
        is_active=True,
    )
    i.set_aws_credentials("AKIATEST", "secrettest")
    i.save()
    return i


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@pytest.fixture
def sandbox_template(user):
    return EmailTemplate.objects.create(
        name="Welcome Email",
        subject="Hello {{name}}",
        html_content="<p>Hi {{name}}, welcome!</p>",
        user=user,
        environment="sandbox",
    )


@pytest.fixture
def prod_template(admin_user):
    return EmailTemplate.objects.create(
        name="Welcome Email",
        subject="Hello {{name}}",
        html_content="<p>Hi {{name}}, welcome!</p>",
        user=admin_user,
        environment="production",
    )


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

@pytest.fixture
def sandbox_event(user, sandbox_template, sandbox_integration):
    return Event.objects.create(
        name="Payment Received",
        user=user,
        template=sandbox_template,
        integration=sandbox_integration,
        environment="sandbox",
        is_active=True,
    )


@pytest.fixture
def prod_event(admin_user, prod_template, prod_integration):
    return Event.objects.create(
        name="Payment Received",
        user=admin_user,
        template=prod_template,
        integration=prod_integration,
        environment="production",
        is_active=True,
    )


# ---------------------------------------------------------------------------
# API Keys
# ---------------------------------------------------------------------------

@pytest.fixture
def sandbox_api_key(user):
    raw = APIKey.generate_key()
    APIKey.objects.create(
        key=APIKey.hash_key(raw),
        prefix=raw[:8],
        name="Sandbox Key",
        user=user,
        environment="sandbox",
    )
    return raw


@pytest.fixture
def prod_api_key(admin_user):
    raw = APIKey.generate_key()
    APIKey.objects.create(
        key=APIKey.hash_key(raw),
        prefix=raw[:8],
        name="Production Key",
        user=admin_user,
        environment="production",
    )
    return raw
