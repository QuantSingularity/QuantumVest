import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "../config/config";

const API_BASE_URL = Config.API_BASE_URL;

const TOKEN_KEY = "@QuantumVest:auth_token";
const REFRESH_TOKEN_KEY = "@QuantumVest:refresh_token";
const USER_KEY = "@QuantumVest:user_data";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Refresh-on-401 flow, mirroring the web client.
let isRefreshing = false;
let pendingQueue = [];

const flushQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

let onSessionExpired = null;
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        isRefreshing = false;
        await AsyncStorage.multiRemove([
          TOKEN_KEY,
          REFRESH_TOKEN_KEY,
          USER_KEY,
        ]);
        onSessionExpired?.();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        if (data.success) {
          await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
          flushQueue(null, data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        }
        throw new Error("Refresh failed");
      } catch (refreshError) {
        flushQueue(refreshError, null);
        await AsyncStorage.multiRemove([
          TOKEN_KEY,
          REFRESH_TOKEN_KEY,
          USER_KEY,
        ]);
        onSessionExpired?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.post("/auth/change-password", data),
  refreshToken: (refreshToken) =>
    api.post("/auth/refresh", { refresh_token: refreshToken }),
};

// ─────────────────────────────────────────────────────────────
// Portfolios
// ─────────────────────────────────────────────────────────────
export const portfolioAPI = {
  list: () => api.get("/portfolios"),
  create: (data) => api.post("/portfolios", data),
  get: (portfolioId) => api.get(`/portfolios/${portfolioId}`),
  remove: (portfolioId) => api.delete(`/portfolios/${portfolioId}`),
  addTransaction: (portfolioId, data) =>
    api.post(`/portfolios/${portfolioId}/transactions`, data),
  getTransactions: (portfolioId, page = 1, perPage = 20) =>
    api.get(`/portfolios/${portfolioId}/transactions`, {
      params: { page, per_page: perPage },
    }),
  getPerformance: (portfolioId, days = 30) =>
    api.get(`/portfolios/${portfolioId}/performance`, { params: { days } }),
  optimize: (portfolioId, data) =>
    api.post(`/portfolios/${portfolioId}/optimize`, data),
};

// ─────────────────────────────────────────────────────────────
// Assets
// ─────────────────────────────────────────────────────────────
export const assetAPI = {
  list: (params = {}) => api.get("/assets", { params }),
  search: (query, params = {}) =>
    api.get("/assets/search", { params: { q: query, ...params } }),
};

// ─────────────────────────────────────────────────────────────
// Watchlists
// ─────────────────────────────────────────────────────────────
export const watchlistAPI = {
  list: () => api.get("/watchlists"),
  get: (watchlistId) => api.get(`/watchlists/${watchlistId}`),
  create: (data) => api.post("/watchlists", data),
  remove: (watchlistId) => api.delete(`/watchlists/${watchlistId}`),
  addItem: (watchlistId, data) =>
    api.post(`/watchlists/${watchlistId}/items`, data),
  removeItem: (watchlistId, itemId) =>
    api.delete(`/watchlists/${watchlistId}/items/${itemId}`),
};

// ─────────────────────────────────────────────────────────────
// Risk analytics
// ─────────────────────────────────────────────────────────────
export const riskAPI = {
  calculateVar: (data) => api.post("/risk/var", data),
  calculateMetrics: (data) => api.post("/risk/metrics", data),
};

// ─────────────────────────────────────────────────────────────
// System
// ─────────────────────────────────────────────────────────────
export const systemAPI = {
  health: () => api.get("/health"),
};

export const AUTH_STORAGE_KEYS = { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY };

export default api;
