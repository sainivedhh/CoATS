# COATS — Cases of Anti Terrorism Squad

## Setup (Fresh Install)

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Delete old database if exists
del db.sqlite3   # Windows
# rm db.sqlite3  # Mac/Linux

# 3. Run migrations
python manage.py makemigrations accounts
python manage.py makemigrations cases
python manage.py migrate

# 4. Create admin superuser
python manage.py createsuperuser

# 5. Create all predefined COATS users (from requirements doc)
python manage.py create_coats_users

# 6. Run Django on port 8002
python manage.py runserver 8002
```

## Setup (Docker - Recommended for Evaluators)

If you have Docker and Docker Compose installed, you can launch the entire application (Backend + Frontend + Database) with a single command:

```bash
docker-compose up --build
```

- **Frontend App:** http://localhost:5173
- **Backend API & Admin:** http://localhost:8002
- **Interactive API Docs (Swagger):** http://localhost:8002/api/schema/swagger-ui/

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## Predefined User Accounts

### Supervisory Officers
| Username    | Branch | Default Password       |
|-------------|--------|------------------------|
| DIG_ATS     | HQ     | coats@DIG2024          |
| SP_ATS_HQ   | HQ     | coats@SPHQ2024         |
| SP_ATS_CNI  | CNI    | coats@SPCNI2024        |
| SP_ATS_MDU  | MDU    | coats@SPMDU2024        |
| SP_ATS_CMB  | CMB    | coats@SPCMB2024        |

### Case Holding Officers (sample)
| Username   | Branch | Default Password        |
|------------|--------|-------------------------|
| ADSP_HQ    | HQ     | coats@ADSPHQ2024        |
| ADSP_CNI   | CNI    | coats@ADSPCNI2024       |
| DSP_CNI    | CNI    | coats@DSPCNI2024        |
| INS1CNI    | CNI    | coats@INS1CNI2024       |
| INS1MDU    | MDU    | coats@INS1MDU2024       |
| INS1CMB    | CMB    | coats@INS1CMB2024       |
*(full list: ADSP/DSP/INS1-4 for each of CNI, MDU, CMB + ADSP_HQ, INSADMIN)*

Change passwords via Django Admin at http://127.0.0.1:8002/admin/

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/token/ | Login |
| GET/POST | /api/cases/ | List / Create cases |
| GET/PATCH | /api/cases/:id/ | Case detail / Update |
| GET/POST | /api/cases/:id/progress/ | Progress entries |
| PATCH | /api/progress/:id/complete/ | Mark progress done |
| POST | /api/cases/:id/handover/ | Handover case (Supervisor) |
| GET | /api/cases/:id/custody/ | Chain of custody |
| GET | /api/cases/:id/chain-verify/ | Blockchain verify |
| GET | /api/officers/ | All case officers |
| GET | /api/case-logs/ | Audit logs |
| GET | /api/dashboard/kpi/ | Dashboard KPIs |

## New Academic Features Added
- **Swagger API Documentation:** Available at `/api/schema/swagger-ui/`
- **Session Security:** Auto-logout frontend sessions after 15 mins of inactivity.
- **Export to PDF:** Download button in Case Details to generate official PDF reports.
- **Dockerization:** Complete `docker-compose` setup for one-click deployment.

## Features Implemented

- **Two-role system**: Supervisory Officers and Case Holding Officers
- **Four branches**: HQ, Chennai (CNI), Madurai (MDU), Coimbatore (CMB)
- **Case stages**: UI / PT / HC / SC / CC
- **Progress Updation**: Date, Details, Reminder Date, Further Action, Remarks, Completion checkbox
- **Case Handover**: Supervisor can reassign cases between officers
- **Blockchain audit**: SHA-256 hash chain — every update creates a tamper-evident block
- **Chain of Custody**: Visual timeline with officer photos
- **Dashboard**: KPIs, severity charts, timeline, branch/date range filter
- **Dark/Light theme** with OS preference detection
