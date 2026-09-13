import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// wraps a page and only renders it if the logged in user has one of the allowed roles
export default function ProtectedRoute({ children, roles }) {
  const { user, authChecked } = useAuth();

  // Wait for the one-time /auth/me revalidation against the backend before
  // deciding access. Otherwise a stale/blocked/role-changed localStorage user
  // could briefly render (or wrongly bounce a valid user) on refresh.
  if (!authChecked) return <div className="container">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
