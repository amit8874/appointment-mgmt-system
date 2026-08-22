import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Normalized socket URL from API_BASE_URL
 * This avoids hardcoding localhost and ensures consistency between HTTP and WS
 */
export const getSocketUrl = () => {
  let url = API_BASE_URL;
  if (url.endsWith('/api')) {
    url = url.replace('/api', '');
  }
  return url;
};

// Detect tenant from subdomain or localStorage
const getTenantSlug = () => {
  const hostname = window.location.hostname;
  
  // Check if it's an IP address
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  
  // If it's an IP or localhost, check localStorage only
  if (isIP || hostname === 'localhost' || hostname === '127.0.0.1') {
    const storedSlug = localStorage.getItem('tenantSlug');
    if (storedSlug && storedSlug !== 'null' && storedSlug !== 'undefined') {
      return storedSlug;
    }
    return null;
  }
  
  // Extract subdomain for real domains
  const parts = hostname.split('.');
  // If it's a domain like clinic.myapp.com (3+ parts), the first part is the subdomain
  // If it's myapp.com (2 parts), there's no subdomain (unless we treat it as apex)
  if (parts.length >= 2) {
    const subdomain = parts[0];
    const commonSubdomains = ['www', 'app', 'api', 'admin', 'portal'];
    if (!commonSubdomains.includes(subdomain.toLowerCase())) {
      return subdomain;
    }
  }

  // Fallback to localStorage for anything else
  const storedSlug = localStorage.getItem('tenantSlug');
  return (storedSlug && storedSlug !== 'null' && storedSlug !== 'undefined') ? storedSlug : null;
};


export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export { followUpReminderApi } from './followUpReminderApi';

// Request interceptor for adding auth token and tenant header
api.interceptors.request.use(
  (config) => {
    // Check sessionStorage and localStorage for token in all possible locations
    let token = sessionStorage.getItem('token') || localStorage.getItem('token');
    
    // If no token in standard location, check userData
    if (!token) {
      const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          token = userData.token;
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
    }
    
    // If still no token, check patientUser
    if (!token) {
      const patientUserStr = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (patientUserStr) {
        try {
          const patientUser = JSON.parse(patientUserStr);
          token = patientUser.token;
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
    }
    
    // List of public endpoints that shouldn't have an Authorization or Tenant header
    const publicEndpoints = [
      '/users/login',
      '/users/signup',
      '/users/superadmin-login',
      '/auth/login',
      '/auth/signup',
      '/auth/superadmin-login',
      '/auth/send-otp',
      '/auth/verify-otp',
      '/organizations',
      '/pharmacy/medicines/search',
      '/upload',
      '/pharmacy/prescriptions/broadcast',
      '/pharmacy/prescriptions/'
    ];



    // normalize URL for matching
    const url = config.url || '';
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    
    // Surgical matching for public endpoints to avoid stripping token from protected routes like trial-status
    const isPublicEndpoint = publicEndpoints.some(endpoint => {
      // For /organizations, only match the EXACT '/' or exact '/public'
      if (endpoint === '/organizations') {
        return normalizedUrl === '/organizations' || normalizedUrl === '/organizations/' || normalizedUrl.startsWith('/organizations/public');
      }
      return normalizedUrl === endpoint || normalizedUrl.startsWith(`${endpoint}?`) || normalizedUrl.startsWith(`${endpoint}/`);
    });
    
    // Only add token if it's not a public endpoint and token is valid
    if (token && token !== 'null' && token !== 'undefined' && !isPublicEndpoint) {
      const authValue = `Bearer ${token}`;
      if (config.headers.set) {
        config.headers.set('Authorization', authValue);
      } else {
        config.headers['Authorization'] = authValue;
      }
    }

    // Add tenant header if available, valid, and NOT a public endpoint (except for /upload)
    const tenantSlug = getTenantSlug();
    if (tenantSlug && tenantSlug !== 'null' && tenantSlug !== 'undefined') {
      const isPublicWithoutTenant = isPublicEndpoint && 
                                    normalizedUrl !== '/upload' && 
                                    normalizedUrl !== '/pharmacy/prescriptions/broadcast';
      if (!isPublicWithoutTenant) {
        if (config.headers.set) {
          config.headers.set('X-Tenant-ID', tenantSlug);
        } else if (!config.headers['X-Tenant-ID']) {
          config.headers['X-Tenant-ID'] = tenantSlug;
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific status codes
      if (error.response.status === 401) {
        // Only log and redirect if it's NOT a known endpoint that may legitimately fire during login
        const url = error.config.url || '';
        const isCheckSession = url.endsWith('/users/check-session');
        const isTrialStatus = url.includes('/trial-status');
        const isLogin = url.includes('/login') || url.includes('/superadmin-login');
        
        if (!isCheckSession && !isTrialStatus && !isLogin) {
          console.error('[API] Unauthorized access - clearing session and redirecting to login');
          
          // Clear all authentication data
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          localStorage.removeItem('userData');
          sessionStorage.removeItem('userData');
          localStorage.removeItem('patientUser');
          sessionStorage.removeItem('patientUser');
          
          // Redirect to login page if we're not already there and we're not on a public page
          const publicPaths = ['/register-organization', '/register-pharmacy', '/choose-plan', '/find-doctors'];
          const isPublicPath = publicPaths.some(p => window.location.pathname.includes(p)) || window.location.pathname === '/';

          if (!window.location.pathname.includes('/login') && !isPublicPath) {
            window.location.href = '/login';
          }
        }
      } else if (error.response.status === 404) {
        console.error('Resource not found');
      } else if (error.response.status === 403) {
        // Check for account deactivation
        const errorData = error.response.data;
        if (errorData?.message === 'account_deactivated') {
          // Dispatch custom event for account deactivation
          window.dispatchEvent(new CustomEvent('account-deactivated', {
            detail: { message: errorData.details }
          }));
        } else if (errorData?.code === 'TRIAL_EXPIRED' || errorData?.code === 'SUBSCRIPTION_EXPIRED') {
          // Dispatch custom event for subscription expiration
          window.dispatchEvent(new CustomEvent('subscription-expired', {
            detail: { 
              message: errorData.message,
              code: errorData.code
            }
          }));
        }
      } else if (error.response.status === 402) {
        const errorData = error.response.data;
        // Dispatch custom event for insufficient WhatsApp credits
        window.dispatchEvent(new CustomEvent('insufficient-whatsapp-credits', {
          detail: { 
            message: errorData?.message || 'Your WhatsApp communication credits are finished. Please contact admin or recharge to continue sending important messages to patients.',
            code: 'INSUFFICIENT_WHATSAPP_CREDITS'
          }
        }));
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from server. Connection possibly reset or timed out.', error.message);
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API functions
export const fetchCounts = async () => {
  try {
    const [doctors, patients, receptionists] = await Promise.all([
      centralDoctorApi.getCount(),
      patientApi.getCount(),
      receptionistApi.getCount()
    ]);
    return {
      doctors,
      patients,
      receptionists
    };
  } catch (error) {
    console.error('Error fetching counts:', error);
    throw error;
  }
};

export const patientApi = {
  getAll: async (params = {}) => {
    // If we're doing server-side pagination, the backend already merges billing/appt data
    // for the current page. We only need to do it here for legacy or specific cases.
    const patientsRes = await api.get('/patients', { params });
    
    // Check if the response is paginated (object) or legacy (array)
    const isPaginated = !Array.isArray(patientsRes.data);
    
    // If it's paginated, use the backend's data as it's already optimized
    if (isPaginated) {
      const formattedPatients = patientsRes.data.patients.map(patient => {
        const rawName = patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
        const cleanName = (() => {
          const prefixes = ['MR', 'MS', 'MRS', 'MISS', 'DR', 'SHRI', 'SMT'];
          let parts = rawName.split(/\s+/);
          while (parts.length > 1) {
            const p0 = parts[0].toUpperCase().replace(/\./g, '');
            const p1 = parts[1].toUpperCase().replace(/\./g, '');
            if (prefixes.includes(p0) && (p0 === p1 || p1.startsWith(p0))) {
              parts.shift();
            } else {
              break;
            }
          }
          return parts.join(' ');
        })();

        return {
          ...patient,
          id: patient.patientId,
          name: cleanName,
          phone: patient.mobile || patient.contactNumber || '',
          contact: patient.mobile || patient.contactNumber || '',
          doc: patient.assignedDoctor,
          date: patient.lastVisit,
        };
      });

      return {
        ...patientsRes.data,
        patients: formattedPatients
      };
    }

    // LEGACY: If not paginated, we still need to merge manually
    const [billsRes, appointmentsRes] = await Promise.all([
      api.get('/billing'),
      api.get('/appointments').catch(() => ({ data: [] }))
    ]);
    
    const patients = patientsRes.data;
    const bills = billsRes.data;
    const appointments = appointmentsRes.data;
    
    // ... rest of the legacy merging logic ...
    const billMap = {};
    bills.forEach(bill => {
      const key = bill.patientId;
      if (key) {
        const billDate = new Date(bill.createdAt || bill.date || 0);
        const existingBillDate = billMap[key] ? new Date(billMap[key].createdAt || billMap[key].date || 0) : new Date(0);
        if (!billMap[key] || billDate >= existingBillDate) {
          billMap[key] = {
            status: (bill.status || 'Pending').toLowerCase(),
            amount: bill.amount || 0,
            createdAt: bill.createdAt,
            date: bill.date
          };
        }
      }
    });

    const formattedPatients = patients.map(patient => {
      const billingInfo = billMap[patient.patientId] || null;
      const totalAmount = billingInfo ? billingInfo.amount : 0;
      const isPaid = billingInfo?.status === 'paid';
      const isDead = billingInfo?.status === 'dead' || patient.status === 'dead';
      const isCancelled = billingInfo?.status === 'cancelled';

      const patientAppointments = appointments.filter(a => a.patientId === patient.patientId);
      const sortedAppts = [...patientAppointments].sort((a, b) => new Date(b.date) - new Date(a.date));
      const latestAppointmentDate = sortedAppts[0]?.date || patient.lastVisit || 'No Visit';
      const assignedDoctor = patient.assignedDoctor || sortedAppts[0]?.doctorName || 'Unassigned';

      const rawName = patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
      return {
        ...patient,
        id: patient.patientId,
        name: rawName,
        phone: patient.mobile || patient.contactNumber || '',
        contact: patient.mobile || patient.contactNumber || '',
        doc: assignedDoctor,
        date: latestAppointmentDate,
        lastVisit: latestAppointmentDate,
        paymentStatus: isDead ? 'dead' : (isCancelled ? 'cancelled' : (isPaid ? 'paid' : 'pending')),
        paidAmount: isPaid ? totalAmount : 0,
        pendingAmount: !isPaid && !isDead && !isCancelled ? totalAmount : 0,
      };
    });

    return formattedPatients;
  },
  getCount: async () => {
    const { data } = await api.get('/patients/count');
    return data.count;
  },
  getById: async (id) => {
    const { data } = await api.get(`/patients/${id}`);
    return data;
  },
  getByPatientId: async (patientId) => {
    const { data } = await api.get(`/patients/by-patient-id?patientId=${patientId}`);
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/patients/${id}`);
    return data;
  },
  update: async (id, patientData) => {
    const { data } = await api.put(`/patients/${id}`, patientData);
    return data;
  },
  getSummary: async (patientId) => {
    const { data } = await api.get(`/appointments/patient/${patientId}/summary`);
    return data;
  },
  searchAvailablePatients: async (query) => {
    const { data } = await api.get(`/patients/search-available?query=${query}`);
    return { patients: data };
  }
};

export const centralDoctorApi = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/doctors', { params });
    return data;
  },
  getCount: async () => {
    const { data } = await api.get('/doctors/count');
    return data.count;
  },
  create: async (doctorData) => {
    const { data } = await api.post('/doctors', doctorData);
    return data;
  },
  update: async (id, doctorData) => {
    const { data } = await api.put(`/doctors/${id}`, doctorData);
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/doctors/${id}`);
    return data;
  },
  delete: async (id) => {
    await api.delete(`/doctors/${id}`);
  },
  verify: async (id) => {
    const { data } = await api.patch(`/doctors/${id}/verify`);
    return data;
  },
  reject: async (id) => {
    const { data } = await api.patch(`/doctors/${id}/reject`);
    return data;
  },
  setAvailabilityOverride: async (id, overrideData) => {
    const { data } = await api.post(`/doctors/${id}/availability-override`, overrideData);
    return data;
  },
  removeAvailabilityOverride: async (id, date) => {
    const { data } = await api.delete(`/doctors/${id}/availability-override?date=${date}`);
    return data;
  },
  getProfileMe: async () => {
    const { data } = await api.get('/doctors/profile/me');
    return data;
  },
  updateProfileMe: async (doctorData) => {
    const { data } = await api.put('/doctors/profile/me', doctorData);
    return data;
  },
  getPublicProfile: async (id) => {
    const { data } = await api.get(`/doctors/public/profile/${id}`);
    return data;
  },
};

export const receptionistApi = {
  getAll: async () => {
    const { data } = await api.get('/receptionists');
    return data;
  },
  getCount: async () => {
    const { data } = await api.get('/receptionists/count');
    return data.count;
  },
  create: async (receptionistData) => {
    const { data } = await api.post('/receptionists', receptionistData);
    return data;
  },
  update: async (id, receptionistData) => {
    const { data } = await api.put(`/receptionists/${id}`, receptionistData);
    return data;
  },
  delete: async (id) => {
    await api.delete(`/receptionists/${id}`);
  },
};

export const notificationApi = {
  getAll: async () => {
    const { data } = await api.get('/notifications');
    return data;
  },

  markAsRead: async (id) => {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.put('/notifications/mark-all-read');
    return data;
  },

  delete: async (id) => {
    await api.delete(`/notifications/${id}`);
  }
};

export const userApi = {
  getAll: async () => {
    const { data } = await api.get('/users');
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  update: async (id, userData) => {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
  },

  delete: async (id) => {
    await api.delete(`/users/${id}`);
  },
};

export const appointmentApi = {
  getTodayStats: async () => {
    const today = new Date();
    const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const { data } = await api.get(`/appointments/stats/today?date=${localDate}`);
    return data;
  },
  getTodayAppointments: async () => {
    const today = new Date();
    const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const { data } = await api.get(`/appointments?date=${localDate}`);
    return data;
  },
  delete: async (id) => {
    await api.delete(`/appointments/${id}`);
  },
  getAll: async () => {
    const { data } = await api.get('/appointments');
    return data;
  },
  getSummary: async (patientId) => {
    const { data } = await api.get(`/appointments/patient/${patientId}/summary`);
    return data;
  },
  updateNotes: async (id, visitNotes) => {
    const { data } = await api.put(`/appointments/${id}/notes`, { visitNotes });
    return data;
  }
};

export const billingApi = {
  getStats: async () => {
    const { data } = await api.get('/billing/stats');
    return data;
  },
  getAll: async (params = {}) => {
    const { data } = await api.get('/billing', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/billing/${id}`);
    return data;
  },
  getByPatient: async (patientId, params = {}) => {
    const { data } = await api.get(`/billing/patient/${patientId}`, { params });
    return data;
  },
  create: async (billData) => {
    const { data } = await api.post('/billing', billData);
    return data;
  },
  update: async (id, billData) => {
    const { data } = await api.put(`/billing/${id}`, billData);
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/billing/${id}`);
    return data;
  },
  sendWhatsApp: async (id) => {
    const { data } = await api.post(`/billing/${id}/send-whatsapp`);
    return data;
  },
  sendEmail: async (id) => {
    const { data } = await api.post(`/billing/${id}/send-email`);
    return data;
  },
  downloadPDF: async (id, isDownload = false, templateId = null) => {
    let url = `/billing/${id}/pdf?`;
    if (isDownload) url += 'download=true&';
    if (templateId) url += `templateId=${templateId}`;
    const { data } = await api.get(url);
    return data;
  },
  generateStatement: async (patientId, payload) => {
    const { data } = await api.post(`/billing/patient/${patientId}/statement`, payload);
    return data;
  },
  sendStatementWhatsApp: async (patientId, payload) => {
    const { data } = await api.post(`/billing/patient/${patientId}/statement/whatsapp`, payload);
    return data;
  },
  getDailyCaseRegisterData: async (params = {}) => {
    const { data } = await api.get('/billing/daily-case-register', { params });
    return data;
  },
  downloadDailyCaseRegisterPDF: async (params = {}) => {
    const { data } = await api.get('/billing/daily-case-register/pdf', { params });
    return data;
  }
};

export const commonApi = {
  uploadImage: async (formData) => {
    const { data } = await api.post('/upload', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return data;
  }
};


// Update patientApi to include getTodayStats
patientApi.getTodayStats = async () => {
  const { data } = await api.get('/patients/stats/today');
  return data.count;
};

// SaaS API Functions

export const organizationApi = {
  register: async (orgData) => {
    const { data } = await api.post('/organizations', orgData);
    return data;
  },
  verifyOTP: async (verifyData) => {
    const { data } = await api.post('/organizations/verify-otp', verifyData);
    return data;
  },
  resendOTP: async (resendData) => {
    const { data } = await api.post('/organizations/resend-otp', resendData);
    return data;
  },
  getAll: async (params = {}) => {
    const { data } = await api.get('/organizations', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/organizations/${id}`);
    return data;
  },
  updateBranding: async (orgId, brandingData) => {
    const { data } = await api.put(`/organizations/${orgId}/branding`, brandingData);
    return data;
  },
  getMySessions: async () => {
    const { data } = await api.get('/users/me/sessions');
    return data;
  },
  revokeSession: async (sessionId) => {
    const { data } = await api.delete(`/users/me/sessions/${sessionId}`);
    return data;
  },
  update: async (id, orgData) => {
    const { data } = await api.put(`/organizations/${id}`, orgData);
    return data;
  },
  getPrescriptionTemplateSettings: async () => {
    const { data } = await api.get('/clinic/prescription-template');
    return data;
  },
  updatePrescriptionTemplateSettings: async (settings) => {
    const { data } = await api.put('/clinic/prescription-template/settings', settings);
    return data;
  },
  uploadPrescriptionTemplate: async (formData) => {
    const { data } = await api.post('/clinic/prescription-template/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  deletePrescriptionTemplate: async () => {
    const { data } = await api.delete('/clinic/prescription-template');
    return data;
  },
  getStats: async (id) => {
    const { data } = await api.get(`/organizations/${id}/stats`);
    return data;
  },
  updateStatus: async (id, status) => {
    const { data } = await api.patch(`/organizations/${id}/status`, { status });
    return data;
  },
  getTrialStatus: async (targetId) => {
    if (!targetId) return null;
    const id = typeof targetId === 'object' ? (targetId._id || targetId.id) : targetId;
    if (!id || typeof id !== 'string' || id.includes('[object')) return null;
    
    const { data } = await api.get(`/organizations/${id}/trial-status`);
    return data;
  },
  dismissResetNotification: async (id) => {
    if (!id) return null;
    const { data } = await api.patch(`/organizations/${id}/dismiss-reset-notification`);
    return data;
  },
};

export const subscriptionApi = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/subscriptions', { params });
    return data;
  },
  getMySubscription: async () => {
    const { data } = await api.get('/subscriptions/my-subscription');
    return data;
  },
  getPlans: async () => {
    const { data } = await api.get('/subscriptions/plans');
    return data;
  },
  upgrade: async (planData) => {
    const { data } = await api.post('/subscriptions/upgrade', planData);
    return data;
  },
  cancel: async () => {
    const { data } = await api.post('/subscriptions/cancel');
    return data;
  },
  verifyPayment: async (paymentData) => {
    const { data } = await api.post('/subscriptions/verify-payment', paymentData);
    return data;
  },
};

export const superAdminApi = {
  getDashboard: async () => {
    const { data } = await api.get('/superadmin/dashboard');
    return data;
  },
  getOrganizations: async (params = {}) => {
    const { data } = await api.get('/superadmin/organizations', { params });
    return data;
  },
  getOrganizationsWithCredentials: async () => {
    const { data } = await api.get('/superadmin/organizations/all-with-credentials');
    return data;
  },
  getSubscriptions: async (params = {}) => {
    const { data } = await api.get('/superadmin/subscriptions', { params });
    return data;
  },
  getRevenue: async (params = {}) => {
    const { data } = await api.get('/superadmin/revenue', { params });
    return data;
  },
  updateOrganizationStatus: async (id, status) => {
    const { data } = await api.patch(`/superadmin/organizations/${id}/status`, { status });
    return data;
  },
  overrideSubscription: async (orgId, overrideData) => {
    const { data } = await api.put(`/superadmin/organizations/${orgId}/subscription/override`, overrideData);
    return data;
  },
  getSystemHealth: async () => {
    const { data } = await api.get('/superadmin/health');
    return data;
  },
  getAuditLogs: async (params) => {
    const { data } = await api.get('/superadmin/audit-logs', { params });
    return data;
  },
  impersonateUser: async (userId) => {
    const { data } = await api.post(`/superadmin/impersonate/${userId}`);
    return data;
  },
  getPharmacies: async () => {
    const { data } = await api.get('/superadmin/pharmacies');
    return data;
  },
  createPharmacy: async (pharmacyData) => {
    const { data } = await api.post('/superadmin/pharmacies', pharmacyData);
    return data;
  },
  updatePharmacyStatus: async (id, status) => {
    const { data } = await api.patch(`/superadmin/pharmacies/${id}/status`, { status });
    return data;
  },
  approvePharmacy: async (id, approvalData) => {
    const { data } = await api.post(`/superadmin/pharmacies/${id}/approve`, approvalData);
    return data;
  },
  updateTrialPeriod: async (id, trialEndDate) => {
    const { data } = await api.patch(`/superadmin/organizations/${id}/trial`, { trialEndDate });
    return data;
  },
  updateOrganizationPlan: async (id, planData) => {
    const payload = typeof planData === 'string' ? { plan: planData } : planData;
    const { data } = await api.patch(`/superadmin/organizations/${id}/plan`, payload);
    return data;
  },
  getOrganizationDoctors: async (orgId) => {
    const { data } = await api.get(`/superadmin/organizations/${orgId}/doctors`);
    return data;
  },
  getOrganizationStats: async () => {
    const { data } = await api.get('/superadmin/organizations/stats');
    return data;
  },
  verifyDoctorSuperAdmin: async (doctorId) => {
    const { data } = await api.patch(`/superadmin/doctors/${doctorId}/verify`);
    return data;
  },
  rejectDoctorSuperAdmin: async (doctorId) => {
    const { data } = await api.patch(`/superadmin/doctors/${doctorId}/reject`);
    return data;
  },
  createPublicDoctorProfile: async (doctorData) => {
    const { data } = await api.post('/superadmin/doctors/create-profile', doctorData);
    return data;
  },
};

export const contactApi = {
  submit: async (messageData) => {
    const { data } = await api.post('/contact', messageData);
    return data;
  },
  getAll: async () => {
    const { data } = await api.get('/contact');
    return data;
  },
  updateStatus: async (id, status) => {
    const { data } = await api.patch(`/contact/${id}/status`, { status });
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/contact/${id}`);
    return data;
  }
};

export const pharmacyApi = {
  getDashboardStats: async () => {
    const { data } = await api.get('/pharmacy/dashboard/stats');
    return data;
  },
  getInventory: async (params = {}) => {
    const { data } = await api.get('/pharmacy/inventory', { params });
    return data;
  },
  updateInventory: async (inventoryData) => {
    const { data } = await api.post('/pharmacy/inventory', inventoryData);
    return data;
  },
  dispenseMedicine: async (dispenseData) => {
    const { data } = await api.post('/pharmacy/inventory/dispense', dispenseData);
    return data;
  },
  bulkUploadInventory: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/pharmacy/inventory/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  getInventoryLogs: async (productId) => {
    const { data } = await api.get(`/pharmacy/inventory/${productId}/logs`);
    return data;
  },
  getOrders: async (params = {}) => {
    const { data } = await api.get('/pharmacy/orders', { params });
    return data;
  },
  updateOrderStatus: async (id, status) => {
    const { data } = await api.patch(`/pharmacy/orders/${id}/status`, { status });
    return data;
  },
  createProduct: async (productData) => {
    const { data } = await api.post('/pharmacy/products', productData);
    return data;
  },
  getProducts: async () => {
    const { data } = await api.get('/pharmacy/products');
    return data;
  },
  searchMedicines: async (query) => {
    const { data } = await api.get(`/pharmacy/medicines/search?q=${query}`);
    return data;
  },
  autoAssign: async (orderData) => {
    const { data } = await api.post('/pharmacy/auto-assign', orderData);
    return data;
  },
  guestMobileLogin: async (mobile) => {
    const { data } = await api.post('/pharmacy/guest-login', { mobile });
    return data;
  },
  broadcastPrescription: async (broadcastData) => {
    const { data } = await api.post('/pharmacy/prescriptions/broadcast', broadcastData);
    return data;
  },
  getBroadcastedOrders: async () => {
    const { data } = await api.get('/pharmacy/prescriptions/broadcasts');
    return data;
  },
  acceptBroadcastedOrder: async (id) => {
    const { data } = await api.post(`/pharmacy/prescriptions/${id}/accept`);
    return data;
  },
  getPharmacyPrescriptions: async () => {
    const { data } = await api.get('/pharmacy/prescriptions/my-orders');
    return data;
  },
  getQuotesForUser: async (id) => {
    const { data } = await api.get(`/pharmacy/prescriptions/${id}/quotes`);
    return data;
  },
  submitQuote: async (id, quoteData) => {
    const { data } = await api.post(`/pharmacy/prescriptions/${id}/quote`, quoteData);
    return data;
  },
  selectQuote: async (id, quoteId) => {
    const { data } = await api.post(`/pharmacy/prescriptions/${id}/select-quote`, { quoteId });
    return data;
  },
  cancelPrescriptionOrder: async (id) => {
    const { data } = await api.post(`/pharmacy/prescriptions/${id}/cancel`);
    return data;
  },

  getPatientPrescriptions: async () => {
    const { data } = await api.get('/pharmacy/prescriptions/patient-orders');
    return data;
  },
  confirmPrescriptionOrder: async (id) => {
    const { data } = await api.post(`/pharmacy/prescriptions/${id}/confirm`);
    return data;
  },

  updatePrescriptionOrderStatus: async (id, status) => {
    const { data } = await api.put(`/pharmacy/prescriptions/${id}/status`, { status });
    return data;
  },
  getAnalytics: async () => {
    const { data } = await api.get('/pharmacy/analytics');
    return data;
  }
};

export const chatbotApi = {
  chat: async (message, history, organizationId, userContext, role) => {
    const { data } = await api.post('/chatbot/chat', { message, history, organizationId, userContext, role });
    return data;
  },
  getCities: async () => {
    const { data } = await api.get('/chatbot/stats/cities');
    return data;
  },
  searchDoctors: async (params) => {
    const { data } = await api.get('/chatbot/search/doctors', { params });
    return data;
  }
};

export const authApi = {
  login: async (credentials) => {
    // Attempt login with role-based routing
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },
  signup: async (userData) => {
    const { data } = await api.post('/auth/signup', userData);
    return data;
  },
  adminLogin: async (credentials) => {
    const { data } = await api.post('/auth/login', { ...credentials, role: 'admin' });
    return data;
  },
  superadminLogin: async (credentials) => {
    const { data } = await api.post('/auth/superadmin-login', credentials);
    return data;
  },

  createReceptionist: async (receptionistData) => {
    const { data } = await api.post('/auth/create-receptionist', receptionistData);
    return data;
  },
  checkSession: async () => {
    const { data } = await api.get('/users/check-session');
    return data;
  },
  registerPharmacy: async (pharmacyData) => {
    const { data } = await api.post('/superadmin/pharmacies/public-register', pharmacyData);
    return data;
  },
  sendOtp: async (phone) => {
    const { data } = await api.post('/auth/send-otp', { phone });
    return data;
  },
  verifyOtp: async (phone, otp) => {
    const { data } = await api.post('/auth/verify-otp', { phone, otp });
    return data;
  }
};

export const analyticsApi = {
  getCharts: async () => {
    const { data } = await api.get('/analytics/charts');
    return data;
  },
  getDashboard: async () => {
    const { data } = await api.get('/analytics/dashboard');
    return data;
  },
  getAppointments: async (params = {}) => {
    const { data } = await api.get('/analytics/appointments', { params });
    return data;
  },
  getDoctors: async () => {
    const { data } = await api.get('/analytics/doctors');
    return data;
  },
  getClinicAnalytics: async (params = {}) => {
    const { data } = await api.get('/analytics/clinic', { params });
    return data;
  },
  getPatients: async () => {
    const { data } = await api.get('/analytics/patients');
    return data;
  },
  getBilling: async (period = 'week') => {
    const { data } = await api.get(`/analytics/billing?period=${period}`);
    return data;
  },
  getAiReport: async (category, dashboardData) => {
    const { data } = await api.post('/analytics/ai-report', { category, dashboardData });
    return data;
  },
  getPredictiveInsights: async (timeRange = 90) => {
    const { data } = await api.get(`/analytics/predictive?timeRange=${timeRange}`);
    return data;
  },
  getActivityLogs: async (params = {}) => {
    const { data } = await api.get('/analytics/activity-logs', { params });
    return data;
  }
};

export const usageAnalyticsApi = {
  trackHeartbeat: async (heartbeatData) => {
    const { data } = await api.post('/analytics/heartbeat', heartbeatData);
    return data;
  },
  getStats: async () => {
    const { data } = await api.get('/analytics/superadmin/usage-stats');
    return data;
  }
};

export const messageApi = {
  getConversations: async () => {
    const { data } = await api.get('/messages/conversations');
    return data;
  },
  getPatientConversation: async (patientId, organizationId) => {
    const { data } = await api.get(`/messages/patient/${patientId}?organizationId=${organizationId}`);
    return data;
  },
  getMessages: async (conversationId, role = 'clinic') => {
    const { data } = await api.get(`/messages/${conversationId}?role=${role}`);
    return data;
  },
  sendMessage: async (messageData) => {
    const { data } = await api.post('/messages', messageData);
    return data;
  },
  explainWithMaya: async (explainData) => {
    const { data } = await api.post('/messages/maya-explain', explainData);
    return data;
  }
};

export default api;

export const centralSpecializationApi = {
  getAll: () => api.get(`/specializations`),
  create: (data) => api.post(`/specializations`, data),
};

export const centralCouncilApi = {
  getAll: () => api.get(`/councils`),
  create: (data) => api.post(`/councils`, data),
};

export const centralPracticeApi = {
  getAll: () => api.get(`/practices`),
  create: (data) => api.post(`/practices`, data),
};

export const whatsappApi = {
  send: async (phone, message) => {
    const { data } = await api.post('/whatsapp/send-whatsapp', { phone, message });
    return data;
  },
  improve: async (text, patientName) => {
    const { data } = await api.post('/whatsapp/improve-message', { text, patientName });
    return data;
  },
  sendPrescription: async (phone, patientName, notes, clinicName) => {
    const { data } = await api.post('/whatsapp/send-prescription', { phone, patientName, notes, clinicName });
    return data;
  },
  sendPrescriptionPdf: async (payload) => {
    const { data } = await api.post('/whatsapp/send-prescription-pdf', payload);
    return data;
  }
};

export const medicalRecordApi = {
  getByPatient: async (patientId) => {
    const { data } = await api.get(`/medical-records/patient/${patientId}`);
    return data;
  },
  create: async (recordData) => {
    const { data } = await api.post('/medical-records', recordData);
    return data;
  },
  update: async (id, recordData) => {
    const { data } = await api.put(`/medical-records/${id}`, recordData);
    return data;
  }
};
export const whatsappCreditsApi = {
  getBalance: async () => {
    const { data } = await api.get('/whatsapp-credits/balance');
    return data;
  },
  getPacks: async () => {
    const { data } = await api.get('/whatsapp-credits/packs');
    return data;
  },
  getTransactions: async (params = {}) => {
    const { data } = await api.get('/whatsapp-credits/transactions', { params });
    return data;
  },
  createRechargeOrder: async (packId) => {
    const { data } = await api.post('/whatsapp-credits/recharge/create-order', { packId });
    return data;
  },
  verifyRecharge: async (verificationData) => {
    const { data } = await api.post('/whatsapp-credits/recharge/verify', verificationData);
    return data;
  }
};

export const emailApi = {
  sendPrescription: async (emailData) => {
    const { data } = await api.post('/email/send-prescription', emailData);
    return data;
  }
};

export const complaintApi = {
  getMaster: async () => {
    const { data } = await api.get('/complaints/master');
    return data;
  },
  addMaster: async (complaintData) => {
    const { data } = await api.post('/complaints/master', complaintData);
    return data;
  }
};

export const diagnosisApi = {
  getMaster: async (params = {}) => {
    const { data } = await api.get('/diagnosis/master', { params });
    return data;
  },
  search: async (q, specialty) => {
    const { data } = await api.get('/diagnosis/search', { params: { q, specialty } });
    return data;
  },
  addMaster: async (diagnosisData) => {
    const { data } = await api.post('/diagnosis/master', diagnosisData);
    return data;
  }
};

// Global Medicine Database API — shared across all clinics
export const medicineApi = {
  // Get recommendations from DB or AI
  getRecommendations: async (contextData) => {
    const { data } = await api.post('/medicines/recommendations', contextData);
    return data;
  },
  // Search medicines by name (for autocomplete)
  search: async (q) => {
    const { data } = await api.get('/medicines/search', { params: { q } });
    return data;
  },
  // Save medicine names to global DB after a pharmacy bill is saved
  bulkSave: async (names) => {
    const { data } = await api.post('/medicines/bulk-save', { names });
    return data;
  },
  getMaster: async () => {
    const { data } = await api.get('/medicines/master');
    return data;
  },
  addMaster: async (medicineData) => {
    const { data } = await api.post('/medicines/master', medicineData);
    return data;
  }
};

export const aiApi = {
  translateAdvice: async (translationData) => {
    const { data } = await api.post('/ai/translate-advice', translationData);
    return data;
  },
  improveAdvice: async (improvementData) => {
    const { data } = await api.post('/ai/improve-advice', improvementData);
    return data;
  }
};

export const prescriptionTemplateApi = {
  save: async (formData) => {
    const { data } = await api.post('/prescription-template/save', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  list: async (organizationId) => {
    const { data } = await api.get(`/prescription-template/list/${organizationId}`);
    return data;
  },
  getDefault: async (organizationId) => {
    const { data } = await api.get(`/prescription-template/default/${organizationId}`);
    return data;
  },
  generatePdf: async (pdfData) => {
    const { data } = await api.post('/prescription-template/generate-pdf', pdfData, {
      timeout: 120000 // Increase timeout to 2 minutes for PDF generation
    });
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/prescription-template/${id}`);
    return data;
  }
};

export const investigationApi = {
  getMaster: async () => {
    const { data } = await api.get('/investigations/master');
    return data;
  },
  search: async (q) => {
    const { data } = await api.get('/investigations/search', { params: { q } });
    return data;
  },
  addMaster: async (investigationData) => {
    const { data } = await api.post('/investigations/master', investigationData);
    return data;
  }
};

export const patientProgressImageApi = {
  upload: async (patientId, formData) => {
    const { data } = await api.post(`/patients/${patientId}/progress-images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },
  list: async (patientId) => {
    const { data } = await api.get(`/patients/${patientId}/progress-images`);
    return data;
  },
  getSignedUrl: async (patientId, imageId) => {
    const { data } = await api.get(`/patients/${patientId}/progress-images/${imageId}/signed-url`);
    return data;
  },
  update: async (patientId, imageId, updateData) => {
    const { data } = await api.put(`/patients/${patientId}/progress-images/${imageId}`, updateData);
    return data;
  },
  delete: async (patientId, imageId) => {
    const { data } = await api.delete(`/patients/${patientId}/progress-images/${imageId}`);
    return data;
  }
};

export const patientProgressComparisonApi = {
  create: async (patientId, formData) => {
    const { data } = await api.post(`/patients/${patientId}/progress-comparisons`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },
  list: async (patientId) => {
    const { data } = await api.get(`/patients/${patientId}/progress-comparisons`);
    return data;
  },
  getDetail: async (patientId, comparisonId) => {
    const { data } = await api.get(`/patients/${patientId}/progress-comparisons/${comparisonId}`);
    return data;
  },
  getSignedUrls: async (patientId, comparisonId) => {
    const { data } = await api.get(`/patients/${patientId}/progress-comparisons/${comparisonId}/signed-urls`);
    return data;
  },
  update: async (patientId, comparisonId, updateData) => {
    const { data } = await api.put(`/patients/${patientId}/progress-comparisons/${comparisonId}`, updateData);
    return data;
  },
  replaceImages: async (patientId, comparisonId, formData) => {
    const { data } = await api.patch(`/patients/${patientId}/progress-comparisons/${comparisonId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },
  delete: async (patientId, comparisonId) => {
    const { data } = await api.delete(`/patients/${patientId}/progress-comparisons/${comparisonId}`);
    return data;
  },
  generatePdf: async (patientId, comparisonId) => {
    const { data } = await api.get(`/patients/${patientId}/progress-comparisons/${comparisonId}/generate-pdf`);
    return data;
  }
};

export const translationApi = {
  translate: async (text, targetLanguage, sourceLanguage = 'auto') => {
    const { data } = await api.post('/translate', { text, targetLanguage, sourceLanguage });
    return data;
  },
  translatePrescription: async (medications, complaints, targetLanguage) => {
    const { data } = await api.post('/translate/prescription-structured', { medications, complaints, targetLanguage });
    return data;
  }
};

export const clinicalNoteApi = {
  create: async (patientId, noteData) => {
    const { data } = await api.post(`/patients/${patientId}/clinical-notes`, noteData);
    return data;
  },
  list: async (patientId, params = {}) => {
    const { data } = await api.get(`/patients/${patientId}/clinical-notes`, { params });
    return data;
  },
  get: async (patientId, noteId) => {
    const { data } = await api.get(`/patients/${patientId}/clinical-notes/${noteId}`);
    return data;
  },
  update: async (patientId, noteId, noteData) => {
    const { data } = await api.put(`/patients/${patientId}/clinical-notes/${noteId}`, noteData);
    return data;
  },
  delete: async (patientId, noteId) => {
    const { data } = await api.delete(`/patients/${patientId}/clinical-notes/${noteId}`);
    return data;
  }
};

export const invoiceTemplateApi = {
  getAll: async () => {
    const { data } = await api.get('/invoice-templates');
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/invoice-templates/${id}`);
    return data;
  },
  create: async (formData) => {
    const { data } = await api.post('/invoice-templates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  update: async (id, formData) => {
    const { data } = await api.put(`/invoice-templates/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/invoice-templates/${id}`);
    return data;
  },
  setDefault: async (id) => {
    const { data } = await api.put(`/invoice-templates/${id}/default`);
    return data;
  },
  seed: async (force = false) => {
    const { data } = await api.post(`/invoice-templates/seed${force ? '?force=true' : ''}`);
    return data;
  }
};

export const progressNoteApi = {
  save: async (noteData) => {
    const { data } = await api.post('/progress-notes/save', noteData);
    return data;
  },
  list: async (organizationId, noteType) => {
    const params = noteType ? { noteType } : {};
    const { data } = await api.get(`/progress-notes/list/${organizationId}`, { params });
    return data;
  },
  update: async (id, noteData) => {
    const { data } = await api.put(`/progress-notes/${id}`, noteData);
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/progress-notes/${id}`);
    return data;
  },
  incrementUsage: async (id) => {
    const { data } = await api.post(`/progress-notes/${id}/usage`);
    return data;
  }
};

export const dentistApi = {
  getDashboard: async () => {
    const { data } = await api.get('/dentist/dashboard');
    return data;
  },
  getPatientTreatments: async (patientId) => {
    const { data } = await api.get(`/dentist/patient/${patientId}/treatments`);
    return data;
  },
  createTreatment: async (patientId, treatmentData) => {
    const { data } = await api.post(`/dentist/patient/${patientId}/treatments`, treatmentData);
    return data;
  },
  updateTreatment: async (treatmentId, treatmentData) => {
    const { data } = await api.put(`/dentist/treatments/${treatmentId}`, treatmentData);
    return data;
  },
  deleteTreatment: async (treatmentId) => {
    const { data } = await api.delete(`/dentist/treatments/${treatmentId}`);
    return data;
  },
  getToothChart: async (patientId) => {
    const { data } = await api.get(`/dentist/patient/${patientId}/chart`);
    return data;
  },
  getPatientImages: async (patientId) => {
    const { data } = await api.get(`/dentist/patient/${patientId}/images`);
    return data;
  },
  uploadDentalImage: async (patientId, imageData) => {
    const { data } = await api.post(`/dentist/patient/${patientId}/images`, imageData);
    return data;
  },
  deleteDentalImage: async (imageId) => {
    const { data } = await api.delete(`/dentist/images/${imageId}`);
    return data;
  },
  getCustomProcedures: async (doctorId = '') => {
    const { data } = await api.get('/dentist/procedures', { params: { doctorId } });
    return data;
  },
  createCustomProcedure: async (procedureData) => {
    const { data } = await api.post('/dentist/procedures', procedureData);
    return data;
  }
};

export const prescriptionContentTemplateApi = {
  create: async (templateData) => {
    const { data } = await api.post('/prescription-content-templates', templateData);
    return data;
  },
  list: async () => {
    const { data } = await api.get('/prescription-content-templates');
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/prescription-content-templates/${id}`);
    return data;
  }
};

export const expenseApi = {
  getEquipment: async (params = {}) => {
    const { data } = await api.get('/expenses/equipment', { params });
    return data;
  },
  createEquipment: async (expenseData) => {
    const { data } = await api.post('/expenses/equipment', expenseData);
    return data;
  },
  updateEquipment: async (id, expenseData) => {
    const { data } = await api.put(`/expenses/equipment/${id}`, expenseData);
    return data;
  },
  deleteEquipment: async (id) => {
    const { data } = await api.delete(`/expenses/equipment/${id}`);
    return data;
  },
  downloadEquipmentPdf: async (params = {}) => {
    return api.get('/expenses/equipment/export/pdf', { params, responseType: 'blob' });
  },

  getConsumerProducts: async (params = {}) => {
    const { data } = await api.get('/expenses/consumer-products', { params });
    return data;
  },
  createConsumerProduct: async (expenseData) => {
    const { data } = await api.post('/expenses/consumer-products', expenseData);
    return data;
  },
  updateConsumerProduct: async (id, expenseData) => {
    const { data } = await api.put(`/expenses/consumer-products/${id}`, expenseData);
    return data;
  },
  deleteConsumerProduct: async (id) => {
    const { data } = await api.delete(`/expenses/consumer-products/${id}`);
    return data;
  },
  downloadConsumerProductsPdf: async (params = {}) => {
    return api.get('/expenses/consumer-products/export/pdf', { params, responseType: 'blob' });
  },

  getLabExpenses: async (params = {}) => {
    const { data } = await api.get('/expenses/lab', { params });
    return data;
  },
  createLabExpense: async (expenseData) => {
    const { data } = await api.post('/expenses/lab', expenseData);
    return data;
  },
  updateLabExpense: async (id, expenseData) => {
    const { data } = await api.put(`/expenses/lab/${id}`, expenseData);
    return data;
  },
  deleteLabExpense: async (id) => {
    const { data } = await api.delete(`/expenses/lab/${id}`);
    return data;
  },
  downloadLabPdf: async (params = {}) => {
    return api.get('/expenses/lab/export/pdf', { params, responseType: 'blob' });
  },

  uploadRecord: async (recordData) => {
    const { data } = await api.post('/expenses/records', recordData);
    return data;
  },
  getRecords: async (params = {}) => {
    const { data } = await api.get('/expenses/records', { params });
    return data;
  },
  deleteRecord: async (id) => {
    const { data } = await api.delete(`/expenses/records/${id}`);
    return data;
  },
  getDashboardStats: async () => {
    const { data } = await api.get('/expenses/dashboard/stats');
    return data;
  },
  getUnifiedExpenses: async (params = {}) => {
    const { data } = await api.get('/expenses/unified', { params });
    return data;
  },
  downloadUnifiedPdf: async (params = {}) => {
    return api.get('/expenses/unified/export/pdf', { params, responseType: 'blob' });
  },
  getExpenseAnalytics: async (params = {}) => {
    const { data } = await api.get('/expenses/analytics', { params });
    return data;
  },
  getOtherExpenses: async (params = {}) => {
    const { data } = await api.get('/expenses/other', { params });
    return data;
  },
  createOtherExpense: async (expenseData) => {
    const { data } = await api.post('/expenses/other', expenseData);
    return data;
  },
  updateOtherExpense: async (id, expenseData) => {
    const { data } = await api.put(`/expenses/other/${id}`, expenseData);
    return data;
  },
  deleteOtherExpense: async (id) => {
    const { data } = await api.delete(`/expenses/other/${id}`);
    return data;
  },
  downloadOtherPdf: async (params = {}) => {
    return api.get('/expenses/other/export/pdf', { params, responseType: 'blob' });
  }
};



