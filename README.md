# COATS — Cases of Anti Terrorism Squad

COATS is a Django REST Framework application with a React/Vite frontend for case workflow tracking, officer handovers, progress entries, and tamper-evident audit history.

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Docker and Docker Compose (optional)

## Local development

1. Create and activate a virtual environment, then install dependencies:

   ```bash
   python -m venv .venv
   # Windows PowerShell: .\.venv\Scripts\Activate.ps1
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Configure settings with environment variables. For local development only, you can use:

   ```powershell
   # Windows PowerShell
   $env:DJANGO_DEBUG = "true"
   $env:DJANGO_SECRET_KEY = "replace-with-a-random-local-development-secret"
   $env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1"
   ```

   macOS/Linux:

   ```bash
   export DJANGO_DEBUG=true
   export DJANGO_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"
   export DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
   ```

3. Apply committed migrations and start the API:

   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver 8002
   ```

4. Start the frontend in a separate terminal:

   ```bash
   cd frontend
   npm ci
   npm run dev -- --host 0.0.0.0
   ```

   Frontend: http://localhost:5173  
   API/admin: http://localhost:8002  
   Swagger: http://localhost:8002/api/schema/swagger-ui/

## Predefined users

The management command can create the predefined supervisor and case-officer usernames, but **passwords must be supplied by the operator**. It intentionally does not contain public default passwords.

Set each password using an environment variable before running `python manage.py create_coats_users`. Variable names are:

- Supervisors: `COATS_SUPERVISOR_PASSWORD_<USERNAME>`
- Case officers: `COATS_CASE_PASSWORD_<USERNAME>`

Replace non-alphanumeric characters in the username with underscores and uppercase the name. For example, the user `DIG_ATS` uses `COATS_SUPERVISOR_PASSWORD_DIG_ATS`. Use unique, strong passwords and a secret manager or deployment environment configuration; do not commit passwords or `.env` files.

Existing accounts are skipped. After provisioning, rotate any credentials previously used with earlier repository versions.

## Production deployment configuration

Set these environment variables from your deployment platform's secret manager:

- `DJANGO_SECRET_KEY`: a high-entropy, private secret
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS`: comma-separated, exact hostnames (no wildcard)
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins
- `DATABASE_URL`: optional PostgreSQL URL; if omitted, SQLite is used

Production mode enables secure session/CSRF cookies, HTTPS redirection, HSTS, clickjacking protection, and content-type sniffing protection. Configure trusted HTTPS proxy headers only when the deployment proxy sets them correctly. Do not expose the development server directly to the public internet.

The included Docker configuration is intended for development/demo use. For production, use a production WSGI server, persistent database/storage, HTTPS termination, and managed secrets.

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/token/` | Obtain JWT access/refresh tokens |
| GET/POST | `/api/cases/` | List/create cases |
| GET/PATCH | `/api/cases/<id>/` | Retrieve/update a case |
| GET/POST | `/api/cases/<id>/progress/` | List/add progress entries |
| PATCH | `/api/progress/<id>/complete/` | Mark progress complete |
| POST | `/api/cases/<id>/handover/` | Supervisor-authorized handover |
| GET | `/api/cases/<id>/custody/` | View chain of custody |
| GET | `/api/cases/<id>/chain-verify/` | Verify audit hash chain |
| GET | `/api/officers/` | List officers |
| GET | `/api/case-logs/` | List case audit events |
| GET | `/api/dashboard/kpi/` | Dashboard KPIs |

## Features

- Role-based workflow for supervisory officers and case-holding officers
- Branch-aware case assignment, case handover, and progress updates
- SHA-256 hash-chained case activity log and verification
- Case details, custody timeline, dashboard, and branch/date filters
- OpenAPI/Swagger API documentation
- React/Vite frontend with PDF report export and inactivity logout
