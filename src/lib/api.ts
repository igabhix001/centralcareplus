import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '@/types';

const API_URL = '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const { state } = JSON.parse(authStorage);
          if (state?.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
          }
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): ApiResponse<never> {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'An error occurred',
      };
    }
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: any; token: string }>('/auth/login', { email, password }),
  register: (data: any) => api.post<{ user: any; token: string }>('/auth/register', data),
  me: () => api.get<any>('/auth/me'),
};

// Patients API
export const patientsApi = {
  getAll: (params?: any) => api.get<any>('/patients', { params }),
  getById: (id: string) => api.get<any>(`/patients/${id}`),
  create: (data: any) => api.post<any>('/patients', data),
  update: (id: string, data: any) => api.put<any>(`/patients/${id}`, data),
  delete: (id: string) => api.delete<any>(`/patients/${id}`),
  getRecords: (id: string) => api.get<any>(`/patients/${id}/records`),
};

// Doctors API
export const doctorsApi = {
  getAll: (params?: any) => api.get<any>('/doctors', { params }),
  getById: (id: string) => api.get<any>(`/doctors/${id}`),
  create: (data: any) => api.post<any>('/doctors', data),
  update: (id: string, data: any) => api.put<any>(`/doctors/${id}`, data),
  delete: (id: string) => api.delete<any>(`/doctors/${id}`),
  getSlots: (id: string, date: string) =>
    api.get<any>(`/doctors/${id}/slots`, { params: { date } }),
  getSpecializations: () => api.get<any>('/doctors/meta/specializations'),
};

// Appointments API
export const appointmentsApi = {
  getAll: (params?: any) => api.get<any>('/appointments', { params }),
  getById: (id: string) => api.get<any>(`/appointments/${id}`),
  create: (data: any) => api.post<any>('/appointments', data),
  update: (id: string, data: any) => api.put<any>(`/appointments/${id}`, data),
  cancel: (id: string) => api.delete<any>(`/appointments/${id}`),
};

// Medical Records API
export const recordsApi = {
  getAll: (params?: any) => api.get<any>('/records', { params }),
  getById: (id: string) => api.get<any>(`/records/${id}`),
  create: (data: any) => api.post<any>('/records', data),
  update: (id: string, data: any) => api.put<any>(`/records/${id}`, data),
};

// Prescriptions API
export const prescriptionsApi = {
  getAll: (params?: any) => api.get<any>('/prescriptions', { params }),
  getById: (id: string) => api.get<any>(`/prescriptions/${id}`),
  create: (data: any) => api.post<any>('/prescriptions', data),
};

// Google Fit API
export const googleFitApi = {
  getAuthUrl: () => api.get<{ url: string }>('/fit/auth-url'),
  callback: (code: string) => api.get<any>('/fit/oauth-callback', { params: { code } }),
  getData: () => api.get<any>('/fit/data'),
};

// Chatbot API
export const chatbotApi = {
  sendMessage: (message: string) => api.post<any>('/chatbot/query', { message }),
};

// Dashboard API
export const dashboardApi = {
  getAdminStats: () => api.get<any>('/dashboard?type=admin'),
  getDoctorStats: () => api.get<any>('/dashboard?type=doctor'),
  getPatientStats: () => api.get<any>('/dashboard?type=patient'),
};

// Appointments for today (Doctor)
export const appointmentsTodayApi = {
  getToday: () => api.get<any>('/appointments/today'),
};

// Audit Logs API
export const auditLogsApi = {
  getAll: (params?: any) => api.get<any>('/audit-logs', { params }),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: any) => api.get<any>('/notifications', { params }),
  markAsRead: (id: string) => api.put<any>(`/notifications/${id}`),
  markAllAsRead: () => api.put<any>('/notifications/read-all'),
  delete: (id: string) => api.delete<any>(`/notifications/${id}`),
};

// Billing API
export const billingApi = {
  getAll: (params?: any) => api.get<any>('/billing', { params }),
  getById: (id: string) => api.get<any>(`/billing/${id}`),
  create: (data: any) => api.post<any>('/billing', data),
  updateStatus: (id: string, data: any) => api.put<any>(`/billing/${id}/status`, data),
  getStats: () => api.get<any>('/billing/stats/summary'),
};

// Extended Auth API
export const extendedAuthApi = {
  ...authApi,
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<any>('/auth/change-password', data),
  forgotPassword: (email: string) =>
    api.post<any>('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post<any>('/auth/reset-password', data),
  updateProfile: (data: any) => api.put<any>('/auth/profile', data),
  createStaff: (data: any) => api.post<any>('/auth/create-staff', data),
};
