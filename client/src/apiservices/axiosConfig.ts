import axios from "axios";

// Create axios instance with default config
// Using environment variable for API base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:30500/api",
  withCredentials: true, // This ensures cookies are sent with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add request interceptor for logging in development
if (import.meta.env.DEV) {
  api.interceptors.request.use(
    (config) => {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

// Response interceptor for logging only (no auto-redirect)
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.url}`, response.status);
    }
    return response;
  },
  (error) => {
    // Log errors but don't auto-redirect
    // Let your component/page logic handle navigation
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url;
      
      if (status === 401) {
        console.error(`❌ 401 Unauthorized: ${url}`);
      } else if (status === 403) {
        console.error(`❌ 403 Forbidden: ${url}`);
      } else if (status === 404) {
        console.error(`❌ 404 Not Found: ${url}`);
      } else if (status === 500) {
        console.error(`❌ 500 Server Error: ${url}`, error.response.data?.message);
      }
    } else if (error.request) {
      console.error("❌ Network Error: No response received");
    }
    
    return Promise.reject(error);
  }
);

export default api;