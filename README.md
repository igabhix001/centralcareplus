# CentralCarePlus - Hospital Management System

A comprehensive, modern web-based Hospital Management System built with Next.js 14, MUI, and TypeScript.

## Features

- **Multi-Portal System**: Separate portals for Admin/Staff, Doctors, and Patients
- **Role-Based Access Control**: SUPERADMIN, STAFF, DOCTOR, PATIENT roles
- **Modern UI**: Built with Material-UI (MUI) with dark mode support
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Health Data Integration**: Google Fit integration for patient health tracking
- **AI Chatbot**: Rule-based medical assistant with disclaimer
- **RESTful API**: Complete backend with authentication, CRUD operations

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Form Validation**: React Hook Form + Zod
- **Charts**: Recharts
- **Styling**: MUI Theme + Tailwind CSS utilities

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: MongoDB
- **Authentication**: JWT with jose
- **Validation**: Zod

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB instance (local or Atlas)

### Frontend Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Central-Care-Plus
```

2. Install frontend dependencies:
```bash
npm install
```

3. Run the frontend development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend Installation

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install backend dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string and JWT secret
```

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Seed the database (optional):
```bash
npm run seed
```

6. Run the backend development server:
```bash
npm run dev
```

The API will be available at [http://localhost:3001](http://localhost:3001).

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@centralcare.com | password123 |
| Staff | staff@centralcare.com | password123 |
| Doctor | doctor@centralcare.com | password123 |
| Patient | patient@centralcare.com | password123 |

## User Creation Guide

### Creating Patients
- Patients can self-register via the **Sign Up** page at `/auth/login`
- Fill in name, email, phone, and password
- Automatically assigned PATIENT role

### Creating Doctors
- Only **Admins/Staff** can create doctor accounts
- Go to **Admin Portal → Doctors → Add Doctor**
- Fill in doctor details including email and password
- Doctor can login immediately with provided credentials

### Creating Staff/Admin Users
- Only **Super Admins** can create staff users
- Go to **Admin Portal → Staff → Add Staff**
- Choose role: STAFF or SUPERADMIN
- Set email and password for the new user

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/register | Patient registration |
| GET | /api/auth/me | Get current user |
| GET | /api/patients | List patients |
| GET | /api/doctors | List doctors |
| GET | /api/doctors/:id/slots | Get available slots |
| GET | /api/appointments | List appointments |
| POST | /api/appointments | Create appointment |
| GET | /api/records | List medical records |
| GET | /api/prescriptions | List prescriptions |
| GET | /api/dashboard/admin | Admin dashboard stats |
| GET | /api/dashboard/doctor | Doctor dashboard stats |
| GET | /api/dashboard/patient | Patient dashboard stats |
| POST | /api/chatbot/query | Chat with AI assistant |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin portal pages
│   ├── doctor/            # Doctor portal pages
│   ├── patient/           # Patient portal pages
│   └── auth/              # Authentication pages
├── components/
│   ├── common/            # Shared components
│   ├── layouts/           # Portal layouts
│   └── chat/              # Chat widget
├── lib/                   # API client and utilities
├── store/                 # Zustand state stores
├── theme/                 # MUI theme configuration
└── types/                 # TypeScript types
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_RASA_URL=http://localhost:5005
GOOGLE_CLIENT_ID=your-google-client-id
```

## Backend Integration

This frontend is designed to work with a Node.js backend. The API client is configured to communicate with:

- **Authentication:** `/auth/*`
- **Patients:** `/patients/*`
- **Doctors:** `/doctors/*`
- **Appointments:** `/appointments/*`
- **Medical Records:** `/records/*`
- **Prescriptions:** `/prescriptions/*`
- **Google Fit:** `/fit/*`
- **Chatbot:** `/chatbot/query`

## New Features (v2.0)

### Notifications System
- Real-time in-app notifications
- Appointment reminders
- Payment due/received alerts
- Lab results notifications

### Billing & Invoicing
- Invoice generation
- Payment tracking
- Revenue analytics
- Multiple payment methods

### Security Enhancements
- Password change functionality
- Forgot password with email reset
- Enhanced session management
- CSRF protection ready

## Deployment Guide

### Frontend Deployment (Vercel)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables:
     - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://your-backend.railway.app/api`)

3. **Custom Domain** (Optional):
   - Add your domain in Vercel project settings
   - Configure DNS records as instructed

### Backend Deployment (Railway)

1. **Create Railway Account**: Go to [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   - Connect your GitHub repository
   - Select the `backend` folder as root directory
   - Railway will auto-detect Node.js

3. **Configure Environment Variables**:
   ```
   DATABASE_URL=mongodb+srv://...
   JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-frontend.vercel.app
   BACKEND_URL=https://your-backend.railway.app
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Generate Prisma Client**:
   - Railway will run `npm run build` which compiles TypeScript
   - Add to package.json build script: `prisma generate && tsc`

### Alternative: Backend on Render

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`

### Database (MongoDB Atlas)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist IP addresses (or allow all: `0.0.0.0/0` for production)
4. Get connection string and add to environment variables

## Production Checklist

- [ ] Set strong JWT_SECRET (min 32 characters)
- [ ] Configure CORS properly (FRONTEND_URL)
- [ ] Enable HTTPS
- [ ] Set up MongoDB Atlas with proper security
- [ ] Configure Google OAuth callback URLs for production
- [ ] Set up monitoring (e.g., LogRocket, Sentry)
- [ ] Configure rate limiting for production traffic
- [ ] Set up database backups
- [ ] Test all authentication flows
- [ ] Verify API endpoints are secured

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/register | Patient registration |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/change-password | Change password |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with token |
| PUT | /api/auth/profile | Update profile |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get user notifications |
| PUT | /api/notifications/:id/read | Mark as read |
| PUT | /api/notifications/read-all | Mark all as read |
| DELETE | /api/notifications/:id | Delete notification |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/billing | Get invoices |
| GET | /api/billing/:id | Get invoice details |
| POST | /api/billing | Create invoice |
| PUT | /api/billing/:id/status | Update payment status |
| GET | /api/billing/stats/summary | Get billing statistics |

## License

MIT
