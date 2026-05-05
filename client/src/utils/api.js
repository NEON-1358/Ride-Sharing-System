const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  // Fallback to current hostname but on port 3000
  return `${window.location.protocol}//${window.location.hostname}:3000/api`;
};

const API_BASE = getApiBase();
const TOKEN_KEY = "rideshare_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(typeof payload === "string" ? payload : payload?.message || "Request failed.");
  }

  return payload;
}

async function request(path, options = {}, tokenOverride) {
  const token = tokenOverride || getToken();
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  return parseResponse(response);
}

export function signup(formData) {
  return request("/auth/signup", { method: "POST", body: formData });
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe() {
  return request("/auth/me");
}

export function getProfile(userId) {
  return request(`/auth/profile/${userId}`);
}

export function updateProfile(formData) {
  return request("/auth/profile", { method: "PUT", body: formData });
}

export function listRides(params = {}) {
  const token = getToken();
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request(`/rides${suffix}`, {}, token);
}

export function createRide(payload) {
  return request("/rides", { method: "POST", body: JSON.stringify(payload) });
}

export function updateRide(rideId, payload) {
  return request(`/rides/${rideId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function updateRideStatus(rideId, payload) {
  return request(`/rides/${rideId}/status`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteRide(rideId) {
  return request(`/rides/${rideId}`, { method: "DELETE" });
}

export function listMyBookings() {
  return request("/bookings/my");
}

export function getChatHistory(bookingId) {
  return request(`/chat/history/${bookingId}`);
}

export function createBooking(payload) {
  return request("/bookings", { method: "POST", body: JSON.stringify(payload) });
}

export function cancelBooking(bookingId) {
  return request(`/bookings/${bookingId}/cancel`, { method: "PATCH" });
}

export function acceptBooking(bookingId) {
  return request(`/bookings/${bookingId}/accept`, { method: "PATCH" });
}

export function rejectBooking(bookingId) {
  return request(`/bookings/${bookingId}/reject`, { method: "PATCH" });
}

export function listNotifications() {
  return request("/notifications");
}

export function markNotificationsRead() {
  return request("/notifications/read-all", { method: "PATCH" });
}

export function createReview(payload) {
  return request("/reviews", { method: "POST", body: JSON.stringify(payload) });
}

export function listAdminOverview() {
  return request("/admin/overview");
}

export function getGoogleAuthUrl(from = "login") {
  return `${API_BASE}/auth/google?from=${from}`;
}
