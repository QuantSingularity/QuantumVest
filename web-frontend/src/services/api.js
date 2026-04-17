import axios from "axios";

// Create axios instance with default configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {
              refresh_token: refreshToken,
            },
          );

          if (response.data.success) {
            localStorage.setItem("access_token", response.data.access_token);
            api.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  refreshToken: (refreshToken) =>
    api.post("/auth/refresh", { refresh_token: refreshToken }),
};

// Market Data API
export const marketDataAPI = {
  getBlockchainData: (symbol) => api.get(`/blockchain-data/${symbol}`),
  getStockData: (symbol) => api.get(`/stock-data/${symbol}`),
  getCryptoData: (symbol) => api.get(`/crypto-data/${symbol}`),
};

// Prediction API
export const predictionAPI = {
  getPrediction: (features) => api.post("/predict", features),
  getBatchPredictions: (symbols) => api.post("/predictions/batch", { symbols }),
};

// Portfolio API
export const portfolioAPI = {
  getPortfolio: () => api.get("/portfolio"),
  createPortfolio: (data) => api.post("/portfolio", data),
  updatePortfolio: (id, data) => api.put(`/portfolio/${id}`, data),
  deletePortfolio: (id) => api.delete(`/portfolio/${id}`),
  optimizePortfolio: (data) => api.post("/portfolio/optimize", data),
  analyzePortfolio: (id) => api.get(`/portfolio/${id}/analysis`),
};

// Watchlist API
export const watchlistAPI = {
  getWatchlist: () => api.get("/watchlist"),
  addToWatchlist: (symbol) => api.post("/watchlist", { symbol }),
  removeFromWatchlist: (symbol) => api.delete(`/watchlist/${symbol}`),
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get("/settings"),
  updateSettings: (data) => api.put("/settings", data),
  changePassword: (data) => api.post("/settings/password", data),
  enable2FA: () => api.post("/settings/2fa/enable"),
  disable2FA: () => api.post("/settings/2fa/disable"),
};

// Analytics API
export const analyticsAPI = {
  getPortfolioAnalytics: () => api.get("/analytics/portfolio"),
  getMarketAnalytics: () => api.get("/analytics/market"),
  getRiskAnalysis: () => api.get("/analytics/risk"),
};

export default api;
