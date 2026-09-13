import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.get("/bookings").then((res) => setBookings(res.data));
  }, []);

  return (
    <div className="container">
      <h2>My Bookings</h2>
      {bookings.length === 0 && <p>No bookings yet.</p>}
      {bookings.map((b) => (
        <div className="card" key={b._id}>
          <p>
            <strong>{b.categories.join(", ")}</strong> — {b.estimatedWeight}kg estimated
            {b.actualWeight ? `, ${b.actualWeight}kg actual` : ""}
          </p>
          <p>
            Status: <span className="badge">{b.status}</span>
          </p>
          <p>Booked on {new Date(b.createdAt).toLocaleString()}</p>
          <Link to={`/track/${b._id}`}>
            <button className="secondary">View details</button>
          </Link>
        </div>
      ))}
    </div>
  );
}
