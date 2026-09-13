import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import BookPickup from "./pages/BookPickup.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import TrackPickup from "./pages/TrackPickup.jsx";
import Rewards from "./pages/Rewards.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import DriverDashboard from "./pages/DriverDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/book"
          element={
            <ProtectedRoute roles={["USER"]}>
              <BookPickup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute roles={["USER"]}>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track/:id"
          element={
            <ProtectedRoute roles={["USER"]}>
              <TrackPickup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rewards"
          element={
            <ProtectedRoute roles={["USER"]}>
              <Rewards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute roles={["USER"]}>
              <Marketplace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute roles={["USER"]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver"
          element={
            <ProtectedRoute roles={["DRIVER"]}>
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
