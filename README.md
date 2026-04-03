# Consultancy CRM MVP

## Project Overview

Consultancy CRM is a full-stack MVP for education and visa consultancies. It provides:

- Role-based authentication for consultancy staff and students
- Student management and profile drill-down
- Visa application creation, tracking, and status history
- Batch document request workflows with student acceptance and secure file uploads
- Reusable document checklist templates by country and visa type
- In-app notification center for students and consultancy staff
- Internal consultancy notes and student activity logs
- Staff task management with assignment, due dates, and progress tracking
- University application tracking for admissions milestones
- Invoice and payment tracking for each student
- Search and export tools for students, documents, visas, and meetings
- Calendar actions for Google Calendar, Outlook/ICS, email reminders, and WhatsApp reminders
- Meeting scheduling, acceptance, rescheduling, and completion
- Responsive React dashboard UI with Tailwind CSS

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Multer

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB running locally or a reachable MongoDB connection string

## Project Structure

```text
crm-consultancy/
├── backend/
└── frontend/
```

## Installation

### 1. Clone or open the project

```bash
cd crm-consultancy
```

### 2. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Update `.env` with your values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/crm_consultancy
JWT_SECRET=your_super_secret_jwt_key_change_this
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Running the Application

### Seed the default consultancy account

```bash
cd backend
npm run seed
```

### Start the backend

```bash
cd backend
npm run dev
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The frontend runs on the Vite dev server and proxies `/api` and `/uploads` to `http://localhost:5000`.

## Default Credentials

- Email: `admin@consultancy.com`
- Password: `admin123`

## API Routes Summary

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a new student account |
| `POST` | `/api/auth/login` | Public | Login for consultancy or student |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user |
| `GET` | `/api/users/students` | Consultancy | Get all student users |
| `GET` | `/api/users/consultancies` | Consultancy | Get consultancy users for assignment workflows |
| `POST` | `/api/visa` | Consultancy | Create a visa application |
| `GET` | `/api/visa` | Consultancy | Get all visa applications |
| `GET` | `/api/visa/my` | Student | Get logged-in student visa applications |
| `GET` | `/api/visa/:id` | Authenticated | Get a single visa application |
| `PATCH` | `/api/visa/:id/status` | Consultancy | Update visa application status |
| `GET` | `/api/templates` | Consultancy | List checklist templates |
| `POST` | `/api/templates` | Consultancy | Create a checklist template |
| `PUT` | `/api/templates/:id` | Consultancy | Update a checklist template |
| `DELETE` | `/api/templates/:id` | Consultancy | Delete a checklist template |
| `GET` | `/api/documents` | Consultancy | Get all document requests |
| `POST` | `/api/documents/request` | Consultancy | Create a document request |
| `GET` | `/api/documents/student/:studentId` | Consultancy | Get document requests for one student |
| `GET` | `/api/documents/my` | Student | Get logged-in student document requests |
| `PATCH` | `/api/documents/:id/accept` | Student | Accept a requested document before upload |
| `POST` | `/api/documents/:id/upload` | Student | Upload a requested document |
| `PATCH` | `/api/documents/:id/status` | Consultancy | Approve or reject uploaded document |
| `POST` | `/api/meetings` | Authenticated | Create a meeting request |
| `GET` | `/api/meetings` | Consultancy | Get all meetings |
| `GET` | `/api/meetings/my` | Student | Get logged-in student meetings |
| `PATCH` | `/api/meetings/:id/status` | Consultancy | Accept, reject, reschedule, or complete a meeting |
| `PATCH` | `/api/meetings/:id/reschedule` | Student | Re-propose or accept a rescheduled meeting |
| `GET` | `/api/notifications/my` | Authenticated | Get current user's notifications |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Mark one notification as read |
| `GET` | `/api/notes/student/:studentId` | Consultancy | Get private consultancy notes for a student |
| `POST` | `/api/notes/student/:studentId` | Consultancy | Add a private consultancy note |
| `DELETE` | `/api/notes/:id` | Consultancy | Delete a private consultancy note |
| `GET` | `/api/activities/student/:studentId` | Consultancy | Get a student's audit/activity log |
| `GET` | `/api/tasks` | Consultancy | List internal staff tasks |
| `POST` | `/api/tasks` | Consultancy | Create a staff task |
| `PATCH` | `/api/tasks/:id` | Consultancy | Update task assignment, status, or due date |
| `DELETE` | `/api/tasks/:id` | Consultancy | Delete a staff task |
| `GET` | `/api/universities` | Consultancy | List all university application trackers |
| `GET` | `/api/universities/student/:studentId` | Consultancy | List university applications for a student |
| `GET` | `/api/universities/my` | Student | View own university application tracker |
| `POST` | `/api/universities` | Consultancy | Create a university application tracker |
| `PATCH` | `/api/universities/:id` | Consultancy | Update a university application tracker |
| `GET` | `/api/invoices` | Consultancy | List all invoices |
| `GET` | `/api/invoices/student/:studentId` | Consultancy | List invoices for one student |
| `GET` | `/api/invoices/my` | Student | View own invoices |
| `POST` | `/api/invoices` | Consultancy | Create an invoice |
| `PATCH` | `/api/invoices/:id` | Consultancy | Update invoice details |
| `POST` | `/api/invoices/:id/payments` | Consultancy | Record an invoice payment |

## Role Permissions

| Feature | Consultancy | Student |
| --- | --- | --- |
| Register account | No | Yes |
| Login | Yes | Yes |
| View own profile session | Yes | Yes |
| View all students | Yes | No |
| Create visa applications | Yes | No |
| View all visa applications | Yes | No |
| View own visa applications | No | Yes |
| Update visa status | Yes | No |
| Request documents | Yes | No |
| View all document requests | Yes | No |
| Send multiple required documents to one student | Yes | No |
| Use checklist templates to auto-send document batches | Yes | No |
| Accept requested documents | No | Yes |
| Upload requested documents | No | Yes |
| Approve or reject documents | Yes | No |
| View notifications | Yes | Yes |
| Manage checklist templates | Yes | No |
| Add private student notes | Yes | No |
| View activity logs | Yes | No |
| Manage staff tasks | Yes | No |
| Track university applications | Yes | View own only |
| Manage invoices and payments | Yes | View own only |
| Create meetings | Yes | Yes |
| Manage all meetings | Yes | No |
| View own meetings | No | Yes |
| Re-propose rescheduled meetings | No | Yes |

## File Upload Details

- Upload route: `POST /api/documents/:id/upload`
- Upload field name: `file`
- Max file size: `10MB`
- Allowed MIME types:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/jpg`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Stored using Multer disk storage in `backend/uploads/`
- Uploaded files are served publicly from `/uploads`
- Filenames are sanitized before writing to disk
- Students must accept a document request before the upload endpoint will accept a file

## Authentication Details

- JWT expiry: `7 days`
- Token storage key in frontend: `crm_token`
- Authorization header format: `Bearer <token>`

## Notes

- The backend auto-seeds the default consultancy admin on server startup.
- Students can only access their own visas, documents, and meetings.
- Consultancy staff can manage all operational records.
- Checklist templates can be applied from the admin document request flow to auto-fill multi-document batches.
- Consultancy staff can review student-level private notes and the full activity log from the student detail page.
- Notification center entries are generated for document, meeting, visa, task, invoice, and tracker events.
