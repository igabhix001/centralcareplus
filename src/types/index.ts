export type UserRole = 'SUPERADMIN' | 'STAFF' | 'DOCTOR' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  patientId?: string;
  doctorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient extends User {
  role: 'PATIENT';
  dob: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  bloodGroup?: string;
  emergencyContact?: string;
  medicalHistory?: string[];
  allergies?: string[];
  googleFitConnected?: boolean;
}

export interface Doctor extends User {
  role: 'DOCTOR';
  specialization: string;
  qualification: string;
  experience: number;
  consultationFee: number;
  bio?: string;
  availability?: DoctorAvailability[];
  rating?: number;
  totalPatients?: number;
}

export interface DoctorAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: Patient;
  doctor?: Doctor;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  type: 'checkup' | 'followup' | 'consultation' | 'emergency';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  diagnosis: string;
  symptoms: string[];
  notes: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  recordId?: string;
  medications: Medication[];
  instructions: string;
  validUntil: string;
  createdAt: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  url: string;
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  timestamp: string;
}

export interface GoogleFitData {
  steps: number;
  heartRate: number;
  caloriesBurned: number;
  sleepHours?: number;
  lastSynced: string;
  history?: {
    date: string;
    steps: number;
    heartRate: number;
    caloriesBurned: number;
  }[];
}

export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingPrescriptions: number;
  availableDoctors: number;
  appointmentsTrend: {
    date: string;
    count: number;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
