# **📘 PRODUCT REQUIREMENTS DOCUMENT (PRD)**

## **Hospital Management System – Technical PRD** 

BrandName: CentralCarePlus  
Logo: CP(beside this CP there will be a plus logo png i have downloaded named:plus-logo)

**Version:** 1.0  
 **Prepared For:** Engineering & UI/UX Teams  
 **Tech Stack:**

* **Frontend:** React (Next.js recommended), **MUI**, React Query/SWR

* **Styling:** MUI Theme \+ optional minimal Tailwind utilities

* **Fonts:** **Inter** or **Roboto** (MUI recommended fonts)

* **Backend:** Node.js (Express/Fastify), Prisma ORM

* **DB:** MongoDB with Prisma Mongo provider

* **Chatbot:** **Rasa deployed on Google Cloud Run**

* **Deployment:** Frontend on Vercel, Backend on Vercel Serverless or Google Cloud Run

* **Integrations:** Google Fit (OAuth \+ Fitness API)

---

# **1\. PRODUCT OVERVIEW**

A secure, modern web-based **Hospital Management System (HMS)** with separate portals for:

### **1\. Admin / Staff (Backend Management)**

Manages everything related to:

* Patients

* Doctors

* Appointments

* Records

* Prescriptions

* Doctor availability

* Analytics dashboards

* Audit logs

### **2\. Doctor Portal**

Doctors can:

* View assigned patients

* Access/update medical records

* Manage appointment availability

* Accept/decline/review appointments

* Write prescriptions

### **3\. Patient Portal**

Patients can:

* View personal medical records

* View prescriptions

* Book appointments

* Browse doctors and slots

* View their synced **Google Fit health data in real-time**

* Chat with rule-based **AI medical assistant (Rasa)**

---

# **2\. CORE APPLICATION ARCHITECTURE**

`Frontend (Next.js + MUI)`   
       `|`  
`API Gateway (Node.js Backend)`  
       `|`  
`MongoDB (Prisma)`  
       `|`  
`Rasa Chatbot (Cloud Run)`  
       `|`  
`Google Fit Integration`

---

# **3\. ROLE-BASED ACCESS CONTROL (RBAC)**

### **Roles**

| Role | Access Summary |
| ----- | ----- |
| **SUPERADMIN** | Full system access (create staff/doctor accounts, system configs) |
| **STAFF** | CRUD for patients, appointments, doctors, records |
| **DOCTOR** | Manage their own patients, records, slots |
| **PATIENT** | Book appointments, view records, edit profile, view Google Fit data |

### **RBAC Technical Notes**

* JWT-based authentication (no 2FA)

* Middleware checks route permissions

* Role stored in JWT claims

* Frontend guards restrict UI elements

* Back-end performs final authorization

---

# **4\. FRONTEND REQUIREMENTS (React \+ MUI)**

## **4.1 Global UI Requirements**

* Use **MUI** only for components (Buttons, Tables, Cards, AppBar, Drawer, Forms, DataGrid, Dialogs).

* Theme file (`theme.ts`) must define:

  * Color palette (Light/Dark mode)

  * Typography using **Inter or Roboto**

  * Component overrides (Button, TextField, Card shadows)

* Responsive design (mobile-first)

* Accessibility:

  * ARIA labels

  * High contrast

  * Proper semantic HTML

* Animation:

  * Minimal transitions using MUI’s built-in transitions

---

## **4.2 Pages & UI Components**

---

# **4.2.1 Authentication Pages**

### **Login / Signup**

Single page with tabs:

* **Login**

* **Signup**

Signup form varies by role:

### **Patient Signup**

* Name

* Email

* Phone

* DOB

* Gender

* Password

* Address

### **Doctor/Staff Signup**

⛔ **Not publicly allowed**  
 ✔ Admin creates doctor/staff via Admin dashboard.

---

# **4.2.2 ADMIN / STAFF DASHBOARD (Main Backend Panel)**

### **Navigation**

Left MUI Drawer:

* Dashboard

* Patients

* Doctors

* Appointments

* Records

* Prescriptions

* Reports / Analytics

* Settings

* Audit Logs

### **Dashboard Widgets**

* Total patients

* Total appointments today

* Available doctors

* Pending prescriptions

* Appointment trends (chart)

### **Patients Module**

* DataGrid with:

  * Search

  * Filter by age, gender, status

  * Pagination

  * Row click → Patient Profile

### **Patient Profile**

Tabs inside profile:

* Overview

* Medical History

* Prescriptions

* Appointments

* Attachments (PDF/image viewer)

### **Doctor Management**

* CRUD doctor profiles

* Set availability/schedule

* Configure slot duration

* Manage holidays

### **Appointments Management**

* Full calendar view

* Drag-and-drop rescheduling

* Slot validation

### **Audit Logging**

* Every CREATE/UPDATE/DELETE stored with:

  * Actor ID

  * Timestamp

  * Action type

  * Old/New values

---

# **4.2.3 DOCTOR PORTAL**

### **Doctor Homepage**

* Today's appointments

* Patient queue

* Quick links to prescribe

* Recent patients

### **Doctor Features**

* Accept/decline appointment

* Update patient notes

* Create medical record

* Upload attachments

* Create prescription

---

# **4.2.4 PATIENT PORTAL**

### **Home**

* Upcoming appointments

* Recent prescriptions

* Linked Google Fit data snapshot

* Chatbot entry point

### **Records Page**

View:

* Doctor visits

* Prescriptions

* Notes

* Attachments

### **Appointments Page**

* Specialization-based search

* Pick doctor → choose available slots

* Appointment summary card

### **Account Settings**

* Profile updates

* Connect Google Fit (OAuth button)

* Privacy settings

### **Doctor Directory**

* Search

* Specialization filters

* Ratings (static for demo)

* Available slots

---

# **5\. GOOGLE FIT INTEGRATION (MANDATORY IN MVP)**

### **5.1 Flow**

1. Patient clicks **Connect Google Fit**

2. Redirect to **Google OAuth**

3. User grants access to Google Fit scopes

4. Backend receives tokens

5. Tokens stored encrypted

6. Cron job OR on-demand API fetches data

7. Data displayed on patient dashboard

### **5.2 Required Scopes**

`https://www.googleapis.com/auth/fitness.heart_rate.read`  
`https://www.googleapis.com/auth/fitness.activity.read`  
`https://www.googleapis.com/auth/fitness.body.read`

### **5.3 Data to Display**

* Steps

* Heart rate

* Calories burned

* Sleep (optional)

Graphing with **MUI Charts** or Recharts.

---

# **6\. RASA CHATBOT DEPLOYMENT (Google Cloud Run)**

### **6.1 Requirements**

* Chatbot must be **rule-based**, providing simple advice for:  
   cold, fever, headache, dysentery, etc.

* Must include **medical disclaimer**

* No diagnosis or prescription

* Encourages visiting doctor

### **6.2 Tech Requirements**

* Rasa 3.x

* Dockerized Rasa server

* Deploy container to **Google Cloud Run**

* Cloud Run ingress: **internal \+ HTTPS**

* Backend communicates with Rasa via REST API

### **6.3 Chat Widget**

* Small floating widget

* Triggered from everywhere on patient UI

* Uses backend → Rasa REST → response

---

# **7\. BACKEND API DESIGN (Node.js)**

### **7.1 Auth**

| Method | Endpoint | Description |
| ----- | ----- | ----- |
| POST | /auth/login | Login user |
| POST | /auth/signup | Only for patients |
| POST | /auth/refresh | Refresh token |

---

### **7.2 Patients**

| Method | Endpoint |
| ----- | ----- |
| GET | /patients |
| POST | /patients |
| GET | /patients/:id |
| PUT | /patients/:id |
| DELETE | /patients/:id |

---

### **7.3 Doctors**

| Method | Endpoint |
| ----- | ----- |
| GET | /doctors |
| POST | /doctors |
| GET | /doctors/:id |
| PUT | /doctors/:id |
| GET | /doctors/:id/availability |

---

### **7.4 Appointments**

| Method | Endpoint |
| ----- | ----- |
| POST | /appointments |
| GET | /appointments |
| PUT | /appointments/:id |
| DELETE | /appointments/:id |

---

### **7.5 Medical Records**

| Method | Endpoint |
| ----- | ----- |
| POST | /records |
| GET | /records/:id |
| GET | /patients/:id/records |
| PUT | /records/:id |

---

### **7.6 Google Fit Integration**

| Method | Endpoint |
| ----- | ----- |
| GET | /fit/auth-url |
| GET | /fit/oauth-callback |
| GET | /fit/data |

---

### **7.7 Rasa Chatbot Bridge**

| Method | Endpoint |
| ----- | ----- |
| POST | /chatbot/query → forwards to Rasa REST |

---

# **8\. DATABASE (PRISMA \+ MONGODB)**

### **Required Collections**

* Users

* Patients

* Doctors

* Appointments

* Medical Records

* Prescriptions

* Audit Logs

* OAuth Tokens (Google Fit)

(If you want, I can generate a **complete Prisma schema file** next.)

---

# **9\. INFRASTRUCTURE REQUIREMENTS**

### **Frontend**

* Hosted on **Vercel**

* Edge caching for assets

Environment variables:

 `NEXT_PUBLIC_API_URL`  
`NEXT_PUBLIC_RASA_URL`  
`GOOGLE_CLIENT_ID`

* 

### **Backend**

* Hosted on Vercel serverless or Google Cloud Run

* Needs:

  * CORS

  * JWT signing keys

  * Prisma client

  * Google Fit tokens encryption

### **Rasa**

* Deployed as a container on **Google Cloud Run**

* Autoscaling min 0, max 5

* Requires environment variables for model path

### **MongoDB**

* Use **MongoDB Atlas Free Tier**

* IP whitelist

* Encrypted storage

---

# **10\. NON-FUNCTIONAL REQUIREMENTS**

### **Performance**

* Initial load \< 3s

* Subsequent loads using React Query cache \< 1s

* API response \< 500ms

### **Security**

* JWT for auth

* No 2FA

* Rate limit auth routes

* Encrypt Google Fit tokens

* Sanitize file uploads

### **Availability**

* 99% uptime target for demo

* Cloud Run autoscaling

### **Scalability**

* Rasa horizontally scales on Cloud Run

* Backend stateless; scalable

* MongoDB cluster with index-based queries

---

# **11\. OUT OF SCOPE**

* Email/SMS notifications

* Insurance claim processing

* Payments module

* Pharmacy & billing beyond prescriptions

* Doctor live chat/video call

---

# **12\. APPENDIX (DESIGN GUIDELINES)**

### **Typography**

* **Primary Font:** Inter

* **Fallback:** Roboto

* Titles: `h1–h5` with medium weight

* Body: 14–16px regular

### **Color Palette (Suggestion)**

`Primary: #1976D2 (MUI Blue)`  
`Secondary: #9C27B0 (Purple)`  
`Background: #F6F7FB`  
`Error: #D32F2F`  
`Success: #2E7D32`

### **Spacing**

* 8px grid system

### **Buttons**

* Rounded corners 8px

* Use MUI variant "contained" for primary CTA

### **Tables**

* Must use **MUI DataGrid**

* Sticky header

* Pagination required

