import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/AdminDashboard';
import UserLogin from './pages/UserLogin';
import UserRegister from './pages/UserRegister';
import Chat from './pages/Chat';
import { ThemeProvider } from './components/theme-provider';

// Protected Route component for admin routes
const ProtectedAdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) {
    return <Navigate to="/admin-login" />;
  }
  return children;
};

// Protected Route component for user routes
const ProtectedUserRoute = ({ children }) => {
  const userToken = localStorage.getItem('userToken');
  if (!userToken) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="workspace-theme">
      <Router>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />

          {/* User Routes */}
          <Route path="/login" element={<UserLogin />} />
          <Route path="/register" element={<UserRegister />} />
          <Route
            path="/chat"
            element={
              <ProtectedUserRoute>
                <Chat />
              </ProtectedUserRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 