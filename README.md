# CoATS Backend (Case and Officer Tracking System)

This repository contains the backend implementation of the CoATS project using Django and Django REST Framework with JWT-based authentication and role-based access control.

Frontend (React) is not implemented yet and is planned for a later phase.

---

## Tech Stack

Backend: Django, Django REST Framework 
Authentication: JWT (SimpleJWT) 
Authorization: Role-Based Access Control (Supervisor / Case Handling Officer) 
Database: PostgreSQL 
Admin Interface: Django Admin 
Tools: curl, Browser 

---

## Features Implemented

- Custom User model with role and branch
- JWT authentication using access and refresh tokens
- Role-based access control enforced at backend
- Officers can create and view only their own cases
- Supervisors can view all cases
- Secure password hashing
- Django Admin for system management
- Proper HTTP responses (401, 403)

---

## Project Structure

coats-backend/
- accounts/
- cases/
- coats/
- manage.py
- requirements.txt
- README.md

---

## Setup Instructions (After Cloning)

**Clone the repository and enter the project directory:**
git clone https://github.com/sainivedhh/CoATS
cd coats-backend 

**Create and activate a virtual environment:**
python3 -m venv venv 
source venv/bin/activate 

**Install required Python packages:**
pip install -r requirements.txt 

**Make sure PostgreSQL is installed and running:**
sudo systemctl start postgresql 

**Create database and database user:**
sudo -i -u postgres 
psql 
CREATE DATABASE coats_db; 
CREATE USER coats_user WITH PASSWORD 'password'; 
GRANT ALL PRIVILEGES ON DATABASE coats_db TO coats_user; 

**Exit PostgreSQL:**
\q 
exit 

**Configure database in `coats/settings.py`:**
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

**Apply migrations:**
python manage.py makemigrations 
python manage.py migrate 

**Create admin (supervisor) user:**
python manage.py createsuperuser 

**Run the development server:**
python manage.py runserver 

**Access admin panel:**
http://127.0.0.1:8000/admin 

---

## JWT Authentication Usage

**Obtain JWT token (login):**
curl -X POST http://127.0.0.1:8000/api/token/ \
-H "Content-Type: application/json" \
-d '{"username":"officer1","password":"officer1"}'

**Use the access token for API requests:**
Authorization: Bearer <ACCESS_TOKEN>
Example – view cases:
curl -X GET http://127.0.0.1:8000/api/cases/ \
-H "Authorization: Bearer <ACCESS_TOKEN>"

---

## Create New Case (Officer)

curl -X POST http://127.0.0.1:8000/api/cases/ \
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

---

## Admin Panel

Admin URL: 
http://127.0.0.1:8000/admin 

Admin can:
- Create and manage users
- Assign roles and branches
- Manage cases

Officers cannot access the admin panel.

---

## Planned Enhancements

- React frontend
- Audit logging
- Rate limiting
- Case workflow enforcement
- Production deployment (Nginx, HTTPS)

---

## Summary

This project implements a secure backend using Django, DRF, JWT authentication, and PostgreSQL with full role-based access control. All security and permissions are enforced at the backend level.

