import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container">
      <h1>SmartWaste</h1>
      <p>Book garbage pickup from home, track collection, and earn reward points for recycling.</p>

      {!user && (
        <div className="card">
          <p>Login or register to book your first pickup.</p>
          <Link to="/login"><button>Login</button></Link>
        </div>
      )}

      {user && user.role === "USER" && (
        <div className="card">
          <p>Reward balance: <strong>{user.rewardPoints} points</strong></p>
          <Link to="/book"><button>Book a pickup</button></Link>
        </div>
      )}
    </div>
  );
}
