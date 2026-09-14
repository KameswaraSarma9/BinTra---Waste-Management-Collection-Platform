import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="navbar">
      <Link to="/" style={{ fontWeight: "bold", fontSize: "18px" }}>
        BinTra
      </Link>
      <div className="links">
        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {user && user.role === "USER" && (
          <>
            <Link to="/book">Book Pickup</Link>
            <Link to="/my-bookings">My Bookings</Link>
            <Link to="/rewards">Rewards</Link>
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/my-orders">My Orders</Link>
          </>
        )}

        {user && user.role === "DRIVER" && (
          <>
            <Link to="/driver">Driver Dashboard</Link>
          </>
        )}

        {user && user.role === "ADMIN" && (
          <>
            <Link to="/admin">Admin Dashboard</Link>
          </>
        )}

        {user && (
          <>
            <span style={{ marginRight: 14, fontWeight: "bold" }}>
              {user.name} ({user.role}) — {user.email}
            </span>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </div>
  );
}
