import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Detect tenant from subdomain or localStorage
const getTenantSlug = () => {
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  // Skip common subdomains
  if (subdomain === 'www' || subdomain === 'app' || subdomain === 'api' || subdomain === 'localhost' || subdomain === '127') {
    // Check localStorage for tenant
    return localStorage.getItem('tenantSlug') || null;
  }
  
  return subdomain;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

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
        // Only log if it's NOT a known endpoint that may legitimately fire before token is ready or during session cleanup
        const url = error.config.url || '';
        const isCheckSession = url.endsWith('/users/check-session');
        const isTrialStatus = url.includes('/trial-status');
        const isLogin = url.includes('/login') || url.includes('/superadmin-login');
        
        if (!isCheckSession && !isTrialStatus && !isLogin) {

          console.error('[API] Unauthorized access - redirecting or clearing session');
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
        }
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
  getAll: async () => {
    const [patientsRes, billsRes, appointmentsRes] = await Promise.all([
      api.get('/patients'),
      api.get('/billing'),
      api.get('/appointments').catch(() => ({ data: [] })) // fallback if error
    ]);
    
    const patients = patientsRes.data;
    const bills = billsRes.data;
    const appointments = appointmentsRes.data;
    
    // Create a map of patientId → latest bill info
    // Billing model status is capitalized: 'Paid', 'Pending', 'Due', 'Cancelled', 'Dead'
    const billMap = {};
    bills.forEach(bill => {
      const key = bill.patientId;
      if (key) {
        // Keep the latest bill (array is sorted by createdAt -1 from backend)
        if (!billMap[key]) {
          billMap[key] = {
            status: (bill.status || 'Pending').toLowerCase(), // normalize to lowercase
            amount: bill.amount || 0
          };
        }
      }
    });

    // Create a map of patientId → appointment amount (as fallback when no billing exists)
    const appointmentAmountMap = {};
    appointments.forEach(appt => {
      const key = appt.patientId;
      if (key && appt.amount > 0 && !appointmentAmountMap[key]) {
        appointmentAmountMap[key] = appt.amount;
      }
    });
    
    return patients.map(patient => {
      const billingInfo = billMap[patient.patientId] || null;
      // If no billing record, use appointment fee as the pending amount
      const fallbackAmount = appointmentAmountMap[patient.patientId] || 0;
      const totalAmount = billingInfo ? billingInfo.amount : fallbackAmount;
      const isPaid = billingInfo?.status === 'paid';
      const isDead = billingInfo?.status === 'dead' || patient.status === 'dead';

      return {
        id: patient.patientId,
        patientId: patient.patientId,
        _id: patient._id,
        name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age || '',
        gender: patient.gender || '',
        bloodGroup: patient.bloodGroup || '',
        dateOfBirth: patient.dateOfBirth || '',
        phone: patient.mobile || patient.contactNumber || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zip: patient.zip || '',
        contact: patient.mobile || patient.contactNumber || '',
        doc: patient.assignedDoctor || 'Unassigned',
        disease: patient.disease || 'Not Specified',
        date: patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : '',
        lastVisit: patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : '',
        status: patient.status || null, // Include patient's own status
        paymentStatus: isDead ? 'dead' : (isPaid ? 'paid' : 'pending'),
        paidAmount: isPaid ? totalAmount : 0,
        pendingAmount: !isPaid && !isDead ? totalAmount : 0,
        email: patient.email || '',
      };
    });
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
  // Add other patient-related API calls here
  delete: async (id) => {
    const { data } = await api.delete(`/patients/${id}`);
    return data;
  }
};

export const centralDoctorApi = {
  getAll: async () => {
    const { data } = await api.get('/doctors');
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

  create: async (userData) => {
    const { data } = await api.post('/users', userData);
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
    const { data } = await api.get('/appointments/stats/today');
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
};

export const billingApi = {
  getStats: async () => {
    const { data } = await api.get('/billing/stats');
    return data;
  },
  getAll: async () => {
    const { data } = await api.get('/billing');
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/billing/${id}`);
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
  }
};

export const commonApi = {
  uploadImage: async (formData) => {
    const { data } = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
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
  getAll: async (params = {}) => {
    const { data } = await api.get('/organizations', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/organizations/${id}`);
    return data;
  },
  update: async (id, orgData) => {
    const { data } = await api.put(`/organizations/${id}`, orgData);
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
  getTrialStatus: async (id) => {
    if (!id) return null;
    const { data } = await api.get(`/organizations/${id}/trial-status`);
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
};

export const pharmacyApi = {
  getDashboardStats: async () => {
    const { data } = await api.get('/pharmacy/dashboard/stats');
    return data;
  },
  getInventory: async () => {
    const { data } = await api.get('/pharmacy/inventory');
    return data;
  },
  updateInventory: async (inventoryData) => {
    const { data } = await api.post('/pharmacy/inventory', inventoryData);
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
  createPrescriptionQuote: async (id, quoteData) => {
    const { data } = await api.post(`/pharmacy/prescriptions/${id}/quote`, quoteData);
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
  getPatients: async () => {
    const { data } = await api.get('/analytics/patients');
    return data;
  },
};

export const chatbotApi = {
  chat: async (message, history = []) => {
    const { data } = await api.post('/chatbot/chat', { message, history });
    return data;
  },
};

export default api;
