import axios from 'axios';
import { getToken, saveToken, clearAuth, handleAuthError } from '../utils/jwt';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  withCredentials: true, // Important for cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (refreshResponse.data.success && refreshResponse.data.data.accessToken) {
          // Save new token
          saveToken(refreshResponse.data.data.accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        console.error('Token refresh failed:', refreshError);
        handleAuthError();
        return Promise.reject(refreshError);
      }
    }

    // If it's an auth error, handle it
    if (error.response?.status === 401) {
      handleAuthError();
    }

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Logout from all devices
  logoutAll: async () => {
    const response = await api.post('/auth/logout-all');
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  // Refresh token (manual call)
  refreshToken: async () => {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/refresh`,
      {},
      { withCredentials: true }
    );
    return response.data;
  },
};

// Board API endpoints
export const boardAPI = {
  // Create new board
  createBoard: async (boardData) => {
    const response = await api.post('/boards', boardData);
    return response.data;
  },

  // Get user's boards
  getUserBoards: async (params = {}) => {
    const response = await api.get('/boards', { params });
    return response.data;
  },

  // Get board by ID
  getBoard: async (boardId) => {
    const response = await api.get(`/boards/${boardId}`);
    return response.data;
  },

  // Update board
  updateBoard: async (boardId, boardData) => {
    const response = await api.put(`/boards/${boardId}`, boardData);
    return response.data;
  },

  // Delete board
  deleteBoard: async (boardId) => {
    const response = await api.delete(`/boards/${boardId}`);
    return response.data;
  },

  // Add drawing element
  addElement: async (boardId, elementData) => {
    const response = await api.post(`/boards/${boardId}/elements`, elementData);
    return response.data;
  },

  // Remove drawing element
  removeElement: async (boardId, elementId) => {
    const response = await api.delete(`/boards/${boardId}/elements/${elementId}`);
    return response.data;
  },

  // Clear board
  clearBoard: async (boardId) => {
    const response = await api.post(`/boards/${boardId}/clear`);
    return response.data;
  },

  // Add collaborator
  addCollaborator: async (boardId, collaboratorData) => {
    const response = await api.post(`/boards/${boardId}/collaborators`, collaboratorData);
    return response.data;
  },

  // Remove collaborator
  removeCollaborator: async (boardId, userId) => {
    const response = await api.delete(`/boards/${boardId}/collaborators/${userId}`);
    return response.data;
  },

  // Get board messages
  getBoardMessages: async (boardId, params = {}) => {
    const response = await api.get(`/boards/${boardId}/messages`, { params });
    return response.data;
  },

  // Send message
  sendMessage: async (boardId, messageData) => {
    const response = await api.post(`/boards/${boardId}/messages`, messageData);
    return response.data;
  },

  // Lock board
  lockBoard: async (boardId) => {
    const response = await api.post(`/boards/${boardId}/lock`);
    return response.data;
  },

  // Unlock board
  unlockBoard: async (boardId) => {
    const response = await api.post(`/boards/${boardId}/unlock`);
    return response.data;
  },
};

// Generic API utilities
export const apiUtils = {
  // Handle API errors
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'An error occurred';
      return {
        success: false,
        message,
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      // Other error
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        status: 0
      };
    }
  },

  // Check API health
  checkHealth: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      throw new Error('API is not available');
    }
  },

  // Get API info
  getApiInfo: async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get API info');
    }
  },
};

// Export axios instance for direct use if needed
export { api };

// Default export
export default {
  auth: authAPI,
  board: boardAPI,
  utils: apiUtils,
};