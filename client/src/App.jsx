import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import { io } from "socket.io-client";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MyRides from "./pages/MyRides";
import OAuthCallback from "./pages/OAuthCallback";
import Profile from "./pages/Profile";
import Signup from "./pages/Signup";
import "./style.css";

export default function App() {
  const { isAuthenticated, user, token } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socketUrl = `${window.location.protocol}//${window.location.hostname}:3000/chat`;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('new_message_notification', (data) => {
      // Don't show toast if we are already in a chat with this person
      // This is a bit tricky to check globally, but we can at least show the notification
      showToast(`New message from ${data.fromName}: ${data.text.substring(0, 30)}${data.text.length > 30 ? '...' : ''}`, 'info');
    });

    return () => socket.disconnect();
  }, [isAuthenticated, token, showToast]);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/my-rides" element={<ProtectedRoute><MyRides /></ProtectedRoute>} />
        <Route path="/profile/:userId?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}
