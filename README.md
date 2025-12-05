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

### Backend (Integrated with Next.js API Routes)
- **Runtime**: Node.js (Vercel Serverless)
- **Framework**: Next.js API Routes
- **ORM**: Prisma
- **Database**: MongoDB Atlas
- **Authentication**: JWT
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

### Environment Setup

1. Copy the environment example file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your values:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/centralcareplus"
JWT_SECRET="your-secure-jwt-secret"
```

3. Generate Prisma client:
```bash
npx prisma generate
```

4. Run the development server:
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000) with API routes at `/api/*`.

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

Create a `.env.local` file (and `.env` for Prisma):

```env
# Required
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/centralcareplus
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Optional (for Google Fit integration)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Note:** No `NEXT_PUBLIC_API_URL` needed - the app uses Next.js API Routes with relative URLs.

## API Routes (Integrated Backend)

All API routes are now integrated into Next.js under `/api/*`:

- **Authentication:** `/api/auth/*`
- **Patients:** `/api/patients/*`
- **Doctors:** `/api/doctors/*`
- **Appointments:** `/api/appointments/*`
- **Medical Records:** `/api/records/*`
- **Prescriptions:** `/api/prescriptions/*`
- **Notifications:** `/api/notifications/*`
- **Dashboard:** `/api/dashboard`
- **Billing:** `/api/billing/*`
- **Google Fit:** `/api/fit/*`
- **Chatbot:** `/api/chatbot/query`

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
     - `DATABASE_URL`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: A secure random string (min 32 characters)
     - `GOOGLE_CLIENT_ID`: (Optional) For Google Fit integration
     - `GOOGLE_CLIENT_SECRET`: (Optional) For Google Fit integration

3. **Custom Domain** (Optional):
   - Add your domain in Vercel project settings
   - Configure DNS records as instructed

### Why Vercel? (Free Tier Benefits)
- **Frontend + Backend in one deployment** - No separate backend hosting needed
- **Serverless API Routes** - Auto-scaling, no server management
- **Free SSL** - HTTPS included
- **Global CDN** - Fast worldwide access
- **100GB bandwidth/month** - Generous free tier

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
