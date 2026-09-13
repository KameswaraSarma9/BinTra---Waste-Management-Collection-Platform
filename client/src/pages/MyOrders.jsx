import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data));
  }, []);

  return (
    <div className="container">
      <h2>My Orders</h2>
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map((o) => (
        <div className="card" key={o._id}>
          {o.products.map((p, i) => (
            <p key={i}>
              {p.name} x{p.quantity} — {p.pointsRequired * p.quantity} points
            </p>
          ))}
          <p>Total points used: {o.pointsUsed}</p>
          <p>Status: <span className="badge">{o.status}</span></p>
          <p>Placed on {new Date(o.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
