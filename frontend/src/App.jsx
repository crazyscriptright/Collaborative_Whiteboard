import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, setupTokenRefresh } from './utils/jwt';
import { authAPI } from './services/api';
import socketService from './services/socket';

// Import components
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Whiteboard from './pages/Whiteboard';
import NotFound from './pages/NotFound';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

// Public Route component (redirect to whiteboard if authenticated)
const PublicRoute = ({ children }) => {
  return !isAuthenticated() ? children : <Navigate to="/whiteboard" replace />;
};

function App() {
  useEffect(() => {
    // Set up automatic token refresh
    const cleanup = setupTokenRefresh(async () => {
      try {
        await authAPI.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // User will be redirected to login by the API interceptor
      }
    });

    // Connect to socket if authenticated
    if (isAuthenticated()) {
      socketService.connect().catch(console.error);
    }

    // Cleanup on unmount
    return () => {
      cleanup();
      socketService.disconnect();
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Home route */}
          <Route path="/" element={<Home />} />

          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          <Route 
            path="/forgot-password" 
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            } 
          />

          {/* Protected routes */}
          <Route 
            path="/whiteboard" 
            element={
              <ProtectedRoute>
                <Whiteboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/whiteboard/:boardId" 
            element={
              <ProtectedRoute>
                <Whiteboard />
              </ProtectedRoute>
            } 
          />

          {/* Default redirects - remove the old default redirect */}
          
          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
