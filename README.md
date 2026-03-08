# CoATS – Case and Officer Tracking System

CoATS is a **full-stack case management system** designed to track criminal cases and officers responsible for them.  
It provides **role-based access control**, **secure authentication**, and a **real-time analytics dashboard for supervisors**.

The system is built using **Django REST Framework for the backend** and **React for the frontend**.

---

# Tech Stack

## Backend
- Django
- Django REST Framework
- JWT Authentication (SimpleJWT)
- PostgreSQL
- Django Admin

## Frontend
- React
- React Router
- Chart.js
- TailwindCSS

## Authentication
- JWT Access + Refresh Tokens
- Role-Based Access Control

---

# Features

## Authentication
- Secure login using JWT
- Token-based API access
- Role stored inside JWT payload

## Role-Based Access

Two system roles:

### Supervisor
- View all cases
- Access analytics dashboard
- Monitor case progress

### Case Handling Officer
- Create cases
- View only assigned cases
- Update case progress

## Case Management
- Create cases
- Track investigation stages
- Assign officers
- Maintain detailed case records

## Dashboard
- Case analytics
- Cases by stage
- Monthly timeline
- Real-time updates

## Admin Panel
- Manage users
- Assign roles
- Manage cases
- System administration

---

# Project Structure
backend/
- accounts/
- cases/
- coats/
- manage.py
- requirements.txt
frontend/
- src/
- components/
- pages/
- package.json
README.md


---

# Setup Instructions (After Cloning)

## Clone the repository
git clone https://github.com/sainivedhh/CoATS.git
cd CoATS

## Backend Setup (Django)
-- Create and activate a virtual environment
python -m venv venv

### Linux / Mac
source venv/bin/activate

### Windows
venv\Scripts\activate
-- Install required Python packages
pip install -r requirements.txt
-- Make sure PostgreSQL is installed and running

### Linux:
sudo systemctl start postgresql
-- Create database and database user
sudo -i -u postgres
psql
CREATE DATABASE coats_db;
CREATE USER coats_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE coats_db TO coats_user;

-- Exit PostgreSQL:
\q
exit

-- Configure database in backend/coats/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'coats_db',
        'USER': 'coats_user',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
-- Apply migrations
python manage.py makemigrations
python manage.py migrate
-- Create admin (supervisor) user
python manage.py createsuperuser
-- Run the backend server
python manage.py runserver 8002

## Backend will run at:
http://127.0.0.1:8002

## Admin panel:
http://127.0.0.1:8002/admin
Frontend Setup (React)

-- Open a new terminal.
cd frontend

Install dependencies:
npm install

Run the frontend development server:
npm run dev

## Frontend runs at:
http://localhost:5173

JWT Authentication Usage
Obtain JWT token (login)
curl -X POST http://127.0.0.1:8002/api/token/ \
-H "Content-Type: application/json" \
-d '{"username":"officer1","password":"officer1"}'
Use the access token for API requests
Authorization: Bearer <ACCESS_TOKEN>

Example – view cases:

curl -X GET http://127.0.0.1:8002/api/cases/ \
-H "Authorization: Bearer <ACCESS_TOKEN>"
Create New Case (Officer)
curl -X POST http://127.0.0.1:8002/api/cases/ \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H "Content-Type: application/json" \
-d '{
  "ps_limit": "Madurai",
  "crime_number": "21/2026",
  "section_of_law": "IPC 420",
  "date_of_occurrence": "2026-02-10",
  "date_of_registration": "2026-02-17",
  "complainant_name": "State",
  "accused_details": "XYZ",
  "gist_of_case": "Fraud",
  "current_stage": "INV",
  "action_to_be_taken": "Investigation"
}'

The backend automatically assigns the case to the logged-in officer.

# Admin Panel
## Admin URL:
http://127.0.0.1:8002/admin

## Admin can:
Create and manage users
Assign roles and branches
Manage cases
Officers cannot access the admin panel.
Planned Enhancements
Audit logging
Case workflow enforcement
Notification system
Advanced analytics
Production deployment (Docker, Nginx, HTTPS)

# Summary
CoATS is a secure full-stack case tracking system built with Django REST Framework and React.
The backend provides JWT authentication, role-based permissions, and REST APIs, while the frontend offers an interactive dashboard and case management interface.
All security and permissions are enforced at the backend level.
