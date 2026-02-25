# Xyno — Email Management Platform

Xyno is a self-hosted transactional email platform built on AWS SES. It gives your team a shared workspace to manage email templates, integrations, events, and delivery logs — with separate sandbox and production environments.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started — Admin Setup](#getting-started--admin-setup)
- [Getting Started — Developer Guide](#getting-started--developer-guide)
- [API Reference (Quick)](#api-reference-quick)

---

## Architecture Overview

| Layer | Technology |
|---|---|
| Backend | Django 5.1 + Django REST Framework |
| Frontend | React 18 + Vite + TypeScript + shadcn/ui |
| Database | PostgreSQL 16 |
| Queue | Celery + Redis |
| Email delivery | AWS SES (via boto3) |
| Auth | JWT (simplejwt) + API Key auth |

**Docker services:** `db`, `redis`, `backend`, `celery-worker`, `frontend`

---

## Getting Started — Admin Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd xyno-claude
cp .env.example .env
```

Edit `.env` and fill in real values:

```env
# Database
POSTGRES_DB=xyno
POSTGRES_USER=xyno_user
POSTGRES_PASSWORD=<strong-password>
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# Django
DJANGO_SECRET_KEY=<generate-a-secret-key>
DJANGO_DEBUG=False                          # set True in local dev
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
FRONTEND_URL=http://localhost:5173          # public URL in production

# Fernet key (encrypts AWS credentials at rest)
# Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FERNET_KEY=<generated-fernet-key>

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Django backend** on port `8000`
- **Celery worker** (background email sending)
- **React frontend** on port `5173`

### 3. Run migrations

```bash
docker compose exec backend python manage.py migrate
```

### 4. Create a Django superuser (for the admin panel)

```bash
docker compose exec backend python manage.py createsuperuser
```

### 5. Register your first admin account

Open **http://localhost:5173/register** and create an account using your **Company Name**.

> Registration automatically creates an Organization from the company name and grants the registering user `admin` role. No manual Django admin setup required.

> **Registration is only open once** — after the first admin registers, the `/register` page is disabled and hidden. All subsequent users must be invited by an admin from the **User Management** page.

### 6. Configure Platform SES (for system emails)

Xyno sends system emails (invite links, password reset) using a **platform-level SES config** managed by the superuser. This is separate from per-org integrations used for transactional email.

1. Open the Django admin at **http://localhost:8000/admin/**
2. Log in with your superuser credentials
3. Go to **Integrations → Platform SES Configuration → Add**
4. Enter your AWS Access Key, Secret Key, region, and sender email
5. Ensure **Is active** is checked and save

> Without this, invite and password reset emails will not be sent. The admin will be shown the invite link directly as a fallback so users can still be onboarded manually.

> Only one Platform SES Configuration is allowed (singleton). The AWS credentials are encrypted at rest using Fernet.

### 7. Configure S3 for Media Storage (image uploads)

Xyno uses S3 to store images uploaded via the template builder and brand components. On EC2, auth is handled automatically via the instance IAM role — no credentials are stored.

1. Open the Django admin at **http://localhost:8000/admin/**
2. Go to **Integrations → Platform S3 Configuration → Add**
3. Select the **region** your bucket is in
4. Enter the **bucket name**
5. Ensure **Is active** is checked and save

**EC2 IAM role requirements** — attach a policy to the instance role with at minimum:

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
}
```

**S3 bucket CORS config** (required for browser uploads):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://your-xyno-domain.com"],
    "ExposeHeaders": []
  }
]
```

> Images are stored at `{org_id}/images/{uuid}.{ext}` with `public-read` ACL and served directly via the S3 URL.

> Only one Platform S3 Configuration is allowed (singleton). No AWS credentials are stored — authentication uses the EC2 instance IAM role.

### 8. Set up AWS SES Integration (for transactional email)

Each organization configures their own SES integration for sending transactional emails (event-triggered emails to end users).

1. Log in to Xyno at **http://localhost:5173**
2. Navigate to **SES Integrations** → **Add Integration**
3. Enter your AWS credentials (Access Key ID + Secret Access Key), region, and sender email
4. Click **Test Connection** to verify the credentials work
5. Click **Verify Sender** to initiate SES sender verification

> Xyno works with IAM users that only have `ses:SendRawEmail` permission. Full permissions (`ses:VerifyEmailIdentity`, `ses:GetSendQuota`) are used when available but are not required.

### 8. Invite team members

1. Go to **User Management** (admin only)
2. Click **Invite User**, enter their name, email, and role (`admin` or `developer`)
3. They'll receive an email with a one-time link to set their password
4. They are automatically added to your organization

---

## Environments: Sandbox vs Production

Xyno has two isolated environments per organization:

| | Sandbox | Production |
|---|---|---|
| Purpose | Testing & development | Live email delivery |
| Who can access | All users (admin + developer) | Admin only |
| Promote to prod | Yes — via "Promote" button | — |

All resources (integrations, templates, events) are scoped to an environment. Build and test in **Sandbox**, then promote to **Production** when ready.

**Promoting a resource:**
- On any Template or Event, click **Promote to Production**
- Xyno copies it to production, wiring up matching production dependencies
- Warnings are shown if a dependency (e.g. the integration) hasn't been promoted yet

---

## Getting Started — Developer Guide

### Logging in

Open **http://localhost:5173/login** and use the credentials from your invite email.

> Developers are locked to the **Sandbox** environment. Only admins can switch to Production.

### Forgot your password?

Click **Forgot password?** on the login page, enter your email, and follow the reset link sent to your inbox.

### Creating a Template

1. Go to **Templates** → **New Template**
2. Use the drag-and-drop builder (Unlayer) or upload raw HTML via **Upload HTML**
3. Use `{{variable_name}}` syntax for dynamic content (e.g. `{{first_name}}`, `{{order_id}}`)
4. Save — placeholders are auto-detected
5. Optionally set default values for each placeholder under **Edit Placeholders**

### Creating an Event

An **Event** binds a template + SES integration to a named trigger slug.

1. Go to **Events** → **New Event**
2. Give it a name and a unique **slug** (e.g. `payment_received`, `welcome_email`)
3. Select the template and SES integration to use
4. Save and toggle **Active**

You can send a test email from the event detail page before going live.

### Triggering an Event via API

Events are triggered by your backend using an **API Key**. Generate one under **API Keys**.

```bash
curl -X POST https://api-xyno.eximpe.com/api/events/trigger/ \
  -H "X-API-Key: xk_sandbox_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment_received",
    "recipient": "customer@example.com",
    "data": {
      "first_name": "Jane",
      "amount": "$49.00",
      "order_id": "ORD-1234"
    }
  }'
```

- The API key determines the **environment** (sandbox or production) automatically
- `data` values are substituted into `{{placeholder}}` fields in the template
- Returns `202 Accepted` with a `task_id` for async tracking

### Viewing Logs

Go to **Logs** to see all sent/failed emails with recipient, subject, status, timestamp, and which event/template was used.

The **Dashboard** shows aggregate stats: emails sent today, last 7 days, last 30 days, and a daily breakdown chart.

---

## API Reference (Quick)

All endpoints are prefixed with `/api/`. JWT auth is required unless noted.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/registration-status/` | None | Check if registration is open (no org exists yet) |
| POST | `/api/auth/register/` | None | Create first admin account (disabled after first org is created) |
| POST | `/api/auth/login/` | None | Obtain JWT access + refresh tokens |
| POST | `/api/auth/token/refresh/` | None | Refresh access token |
| GET | `/api/auth/profile/` | JWT | Get current user profile |
| POST | `/api/auth/forgot-password/` | None | Request password reset email |
| POST | `/api/auth/reset-password/` | None | Set new password via reset token |
| POST | `/api/auth/users/invite/` | JWT (admin) | Invite a new user |
| POST | `/api/auth/set-password/` | None | Set password via invite token |

### Resources

All require JWT. Set environment via `X-Environment: sandbox` or `X-Environment: production` header (developers are always forced to sandbox).

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/integrations/` | List / create SES integrations |
| POST | `/api/integrations/{id}/verify_sender/` | Trigger SES sender verification |
| POST | `/api/integrations/{id}/test_connection/` | Test AWS credentials |
| GET/POST | `/api/templates/` | List / create email templates |
| POST | `/api/templates/{id}/preview/` | Render template with context data |
| POST | `/api/templates/{id}/promote/` | Copy sandbox template to production |
| POST | `/api/templates/upload-html/` | Create template from HTML file |
| GET/POST | `/api/events/definitions/` | List / create events |
| POST | `/api/events/definitions/{id}/test/` | Send a test email for this event |
| POST | `/api/events/definitions/{id}/promote/` | Copy sandbox event to production |
| GET | `/api/logs/` | List email logs (paginated, filterable) |
| GET | `/api/logs/dashboard-stats/` | Aggregate email statistics |
| POST | `/api/media/upload/` | Upload an image to S3 (returns `{ url }`) — JPEG, PNG, GIF, WebP, max 5 MB |

### Event Trigger (API Key auth)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/events/trigger/` | `X-API-Key` header | Trigger an event and queue email |

API key format: `xk_<environment>_<random>` — the environment is derived from the key itself, no header needed.

---

## Dark Mode

Click the **sun/moon icon** in the top-right corner of the app to toggle between light and dark mode. The preference is saved in your browser and defaults to your OS setting.

---

## Running Tests

```bash
docker compose exec backend pytest
```

All 61 tests should pass.

---

## Tech Notes for Contributors

- **AWS credentials** are encrypted with Fernet before storage — never stored in plaintext (applies to both org integrations and Platform SES config)
- **API keys** are hashed with SHA-256 — the raw key is shown only once at creation
- **Template rendering** uses simple `{{var}}` string replacement — no Jinja2, preventing template injection
- **Org scoping:** all reads use `filter(user__organization=...)` — every user in the same org shares all data
- **`perform_create`** still uses `user=request.user` — the creator is recorded for audit purposes
- **Celery** handles all email sending asynchronously via the `send_event_email` task
- **Platform SES config** is a singleton model — system emails (invites, password reset) use it first, falling back to an org member's integration if not configured
- **Event slugs** are always auto-generated from the event name on save — manual slug entry is not required
- **S3 media storage** uses the EC2 instance IAM role — no credentials are stored in the database. The `PlatformS3Config` singleton holds only the region and bucket name. Images are uploaded with `public-read` ACL and referenced directly by URL in templates
