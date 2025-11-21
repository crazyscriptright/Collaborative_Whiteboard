// Token management utilities for frontend

const TOKEN_KEY = 'whiteboard_access_token';
const USER_KEY = 'whiteboard_user';
const LAST_BOARD_KEY = 'whiteboard_last_board_url';

/**
 * Save access token to localStorage
 * @param {string} token - JWT access token
 */
export const saveToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Get access token from localStorage
 * @returns {string|null} - JWT access token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove access token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Save user data to localStorage
 * @param {object} user - User object
 */
export const saveUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Get user data from localStorage
 * @returns {object|null} - User object or null if not found
 */
export const getUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

/**
 * Remove user data from localStorage
 */
export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if token exists and is valid format
 */
export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;

  try {
    // Basic JWT format validation (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Check if token is expired (basic check)
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      removeToken();
      removeUser();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    removeToken();
    removeUser();
    return false;
  }
};

/**
 * Parse JWT token to get payload
 * @param {string} token - JWT token
 * @returns {object|null} - Token payload or null if invalid
 */
export const parseToken = (token = null) => {
  const tokenToParse = token || getToken();
  
  if (!tokenToParse) return null;

  try {
    const parts = tokenToParse.split('.');
    if (parts.length !== 3) return null;

    return JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error('Token parsing error:', error);
    return null;
  }
};

/**
 * Get token expiration time
 * @returns {Date|null} - Expiration date or null if no token
 */
export const getTokenExpiration = () => {
  const payload = parseToken();
  return payload && payload.exp ? new Date(payload.exp * 1000) : null;
};

/**
 * Check if token will expire soon (within 5 minutes)
 * @returns {boolean} - True if token expires soon
 */
export const isTokenExpiringSoon = () => {
  const expiration = getTokenExpiration();
  if (!expiration) return false;

  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  return (expiration.getTime() - now.getTime()) < fiveMinutes;
};

/**
 * Clear all authentication data
 */
export const clearAuth = () => {
  removeToken();
  removeUser();
};

/**
 * Set up automatic token refresh check
 * @param {function} refreshCallback - Function to call when token needs refresh
 * @returns {function} - Cleanup function to clear the interval
 */
export const setupTokenRefresh = (refreshCallback) => {
  const checkInterval = setInterval(() => {
    if (isAuthenticated() && isTokenExpiringSoon()) {
      refreshCallback();
    }
  }, 60000); // Check every minute

  return () => clearInterval(checkInterval);
};

/**
 * Get authorization header for API requests
 * @returns {object} - Authorization header object
 */
export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Handle authentication success
 * @param {object} authData - Auth response data containing user and token
 */
export const handleAuthSuccess = (authData) => {
  if (authData.accessToken) {
    saveToken(authData.accessToken);
  }
  
  if (authData.user) {
    saveUser(authData.user);
  }
};

/**
 * Save last visited board URL
 * @param {string} boardId - Board ID
 */
export const saveLastBoardUrl = (boardId) => {
  if (boardId) {
    localStorage.setItem(LAST_BOARD_KEY, `/whiteboard/${boardId}`);
  }
};

/**
 * Get last visited board URL
 * @returns {string|null} - Last board URL or null
 */
export const getLastBoardUrl = () => {
  return localStorage.getItem(LAST_BOARD_KEY);
};

/**
 * Remove last board URL from localStorage
 */
export const removeLastBoardUrl = () => {
  localStorage.removeItem(LAST_BOARD_KEY);
};

/**
 * Handle authentication error/logout
 */
export const handleAuthError = () => {
  clearAuth();
  
  // Redirect to login page if not already there
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
};