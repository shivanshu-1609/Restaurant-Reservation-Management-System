const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "restaurant-reservation-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error?.message || "Request failed");
    error.code = payload.error?.code;
    error.details = payload.error?.details;
    throw error;
  }

  return payload;
}

export const api = {
  register: (body) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  login: (body) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  me: () => apiRequest("/api/auth/me"),
  myReservations: () => apiRequest("/api/reservations/my"),
  createReservation: (body) =>
    apiRequest("/api/reservations", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  cancelReservation: (id) =>
    apiRequest(`/api/reservations/${id}/cancel`, {
      method: "PATCH"
    }),
  adminReservations: (date) => apiRequest(`/api/admin/reservations${date ? `?date=${date}` : ""}`),
  updateReservation: (id, body) =>
    apiRequest(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  adminCancelReservation: (id) =>
    apiRequest(`/api/admin/reservations/${id}/cancel`, {
      method: "PATCH"
    }),
  adminTables: () => apiRequest("/api/admin/tables"),
  createTable: (body) =>
    apiRequest("/api/admin/tables", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  updateTable: (id, body) =>
    apiRequest(`/api/admin/tables/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  deactivateTable: (id) =>
    apiRequest(`/api/admin/tables/${id}`, {
      method: "DELETE"
    })
};
