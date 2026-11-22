const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
function getToken() {
  return localStorage.getItem("clinicyar_token");
}
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    // پاسخ بدون بدنه، مثلاً 204
  }

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      "خطا در ارتباط با سرور";

    throw new Error(message);
  }

  return data;
}

export const api = {
      login: (username, password, companyCode) =>
    request("/auth/login", {
      method: "POST",
      body: { username, password, company_code: companyCode },
      auth: false,
    }),

  me: () => request("/auth/me"),

  listBranches: () => request("/branches"),
  createBranch: (payload) =>
    request("/branches", {
      method: "POST",
      body: payload,
    }),

  updateBranch: (id, payload) =>
    request(`/branches/${id}`, {
      method: "PUT",
      body: payload,
    }),

  deleteBranch: (id) =>
    request(`/branches/${id}`, {
      method: "DELETE",
    }),
  activateBranch: (id) =>
    request(`/branches/${id}/activate`, {
      method: "PATCH",
    }),

  deactivateBranch: (id) =>
    request(`/branches/${id}/deactivate`, {
      method: "PATCH",
    }),
  listOffices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/offices${qs ? `?${qs}` : ""}`);
  },

  getOffice: (id) => request(`/offices/${id}`),

  createOffice: (payload) =>
    request("/offices", {
      method: "POST",
      body: payload,
    }),

  updateOffice: (id, payload) =>
    request(`/offices/${id}`, {
      method: "PUT",
      body: payload,
    }),

  deleteOffice: (id) =>
    request(`/offices/${id}`, {
      method: "DELETE",
    }),
  activateOffice: (id) =>
    request(`/offices/${id}/activate`, {
      method: "PATCH",
    }),

  deactivateOffice: (id) =>
    request(`/offices/${id}/deactivate`, {
      method: "PATCH",
    }),
  updateDoctor: (id, payload) =>
    request(`/doctors/${id}`, {
      method: "PUT",
      body: payload,
    }),

  deleteDoctor: (id) =>
    request(`/doctors/${id}`, {
      method: "DELETE",
    }),
  deactivateDoctor: (id) =>
    request(`/doctors/${id}/deactivate`, {
      method: "PATCH",
    }),

  activateDoctor: (id) =>
    request(`/doctors/${id}/activate`, {
      method: "PATCH",
    }),
  assignDoctorToOffice: (officeId, doctorId) =>
    request(`/offices/${officeId}/doctors`, {
      method: "POST",
      body: { doctor_id: doctorId },
    }),

  removeDoctorFromOffice: (officeId, doctorId) =>
    request(`/offices/${officeId}/doctors/${doctorId}`, {
      method: "DELETE",
    }),

  assignOfficeToBranch: (officeId, branchId) =>
    request(`/offices/${officeId}/branches`, {
      method: "POST",
      body: { branch_id: branchId },
    }),

  removeOfficeFromBranch: (officeId, branchId) =>
    request(`/offices/${officeId}/branches/${branchId}`, {
      method: "DELETE",
    }),
  listDoctors: (branchId) =>
    request(`/doctors${branchId ? `?branch_id=${branchId}` : ""}`),

  myDoctorProfile: () => request("/doctors/me"),

  doctorSchedule: (doctorId) =>
    request(`/doctors/${doctorId}/schedule`),

  setDoctorSchedule: (doctorId, payload) =>
    request(`/doctors/${doctorId}/schedule`, {
      method: "POST",
      body: payload,
    }),

  searchPatients: (q) =>
    request(`/patients/search?q=${encodeURIComponent(q)}`),

  createPatient: (patient) =>
    request("/patients", {
      method: "POST",
      body: patient,
    }),
  updatePatient: (id, payload) =>
    request(`/patients/${id}`, {
      method: "PUT",
      body: payload,
    }),
  getPatient: (id) =>
    request(`/patients/${id}`),

  listPatientsByDoctor: (doctorId) =>
    request(`/patients?doctor_id=${doctorId}`),

  listAppointments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/appointments${qs ? `?${qs}` : ""}`);
  },

  createAppointment: (appt) =>
    request("/appointments", {
      method: "POST",
      body: appt,
    }),

  updateAppointmentStatus: (id, status) =>
    request(`/appointments/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
rescheduleAppointment: (id, payload) =>
  request(`/appointments/${id}/reschedule`, {
    method: "PATCH",
    body: payload,
  }),
  createVisit: (visit) =>
    request("/visits", {
      method: "POST",
      body: visit,
    }),

  getVisit: (id) =>
    request(`/visits/${id}`),

  listInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/invoices${qs ? `?${qs}` : ""}`);
  },

  quickCheckout: (payload) =>
    request("/invoices/quick-checkout", {
      method: "POST",
      body: payload,
    }),

  financeSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/invoices/summary${qs ? `?${qs}` : ""}`);
  },
  getDashboardSummary: () => request("/dashboard/summary"),
  listUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/users${qs ? `?${qs}` : ""}`);
  },
  createUser: (payload) =>
    request("/users", {
      method: "POST",
      body: payload,
    }),

  deactivateUser: (id) =>
    request(`/users/${id}/deactivate`, {
      method: "PATCH",
    }),
  activateUser: (id) =>
    request(`/users/${id}/activate`, {
      method: "PATCH",
    }),
  updateUser: (id, payload) =>
    request(`/users/${id}`, {
      method: "PUT",
      body: payload,
    }),

  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: "DELETE",
    }),
  listSpecialties: () =>
    request("/specialties"),

  createSpecialty: (name) =>
    request("/specialties", {
      method: "POST",
      body: { name },
    }),

  // ============ پنل بیمار ============
  // Favorites
  listFavorites: () => request("/favorites"),
  addFavorite: (doctor_id) =>
    request("/favorites", {
      method: "POST",
      body: { doctor_id },
    }),
  removeFavorite: (doctor_id) =>
    request(`/favorites/${doctor_id}`, {
      method: "DELETE",
    }),
  patientLogin: (phone, national_code, full_name) =>
    request("/auth/patient-login", {
      method: "POST",
      body: { phone, national_code, full_name },
      auth: false,
    }),
bulkRescheduleAppointments: (payload) =>
  request("/appointments/bulk-reschedule", {
    method: "PATCH",
    body: payload,
  }),
  getPotentialRecords: () => request("/patient-portal/potential-records"),

  requestPatientLink: (patient_id) =>
    request("/patient-portal/request-link", {
      method: "POST",
      body: { patient_id },
    }),

   getMyPatientRecords: () => request("/patient-portal/my-records"),
  getMyAppointments: () => request("/patient-portal/my-appointments"),
//تابع گرفتن روزهای کاری پزشک//
  getDoctorDays: (doctor_id, branch_id) =>
    request(`/patient-portal/doctor-days?doctor_id=${doctor_id}&branch_id=${branch_id}`),

getDoctorSlots: (doctor_id, branch_id, date) =>
  request(`/patient-portal/doctor-slots?doctor_id=${doctor_id}&branch_id=${branch_id}&date=${date}`),

  getPatientDoctors: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/patient-portal/doctors${qs ? `?${qs}` : ""}`);
  },
  getMyPrescriptions: () => request("/patient-portal/my-prescriptions"),
  getMyInvoices: () => request("/patient-portal/my-invoices"),

  // Notifications
  listNotifications: () => request("/notifications"),
  getUnreadNotificationCount: () => request("/notifications/unread-count"),
  markNotificationAsRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsAsRead: () => request("/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: "DELETE" }),

  requestAppointment: (payload) =>
    request("/patient-portal/request-appointment", {
      method: "POST",
      body: payload,
    }),
  // ============ درخواست‌های اتصال (منشی/مدیر) ============
  listPendingLinks: () => request("/patient-portal/pending-links"),

  approvePatientLink: (id) =>
    request(`/patient-portal/links/${id}/approve`, {
      method: "PATCH",
    }),

  rejectPatientLink: (id) =>
    request(`/patient-portal/links/${id}`, {
      method: "DELETE",
    }),
  // ============ درخواست‌های نوبت (منشی/مدیر) ============
  listPendingAppointments: () => request("/appointments/pending"),

  reviewAppointment: (id, action) =>
    request(`/appointments/${id}/review`, {
      method: "PATCH",
      body: { action },
    }),
  changePassword: (current_password, new_password) =>
    request("/auth/change-password", {
      method: "PUT",
      body: { current_password, new_password },
    }),
  getMyPatientProfile: () => request("/patient-portal/my-profile"),

  updateMyPatientProfile: (payload) =>
    request("/patient-portal/my-profile", {
      method: "PUT",
      body: payload,
    }),
};
export function saveToken(token) {
  localStorage.setItem("clinicyar_token", token);
}

export function clearToken() {
  localStorage.removeItem("clinicyar_token");
  localStorage.removeItem("patient_token");
  localStorage.removeItem("staff_token");
}
export { getToken };
