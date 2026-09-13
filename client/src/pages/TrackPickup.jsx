import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { getSocket } from "../services/socket";

const TIMELINE_STEPS = [
  "CREATED",
  "TRUCK_ASSIGNED",
  "DRIVER_ACCEPTED",
  "ON_THE_WAY",
  "ARRIVED",
  "OTP_SENT",
  "OTP_VERIFIED",
  "COLLECTED",
  "COMPLETED",
];

export default function TrackPickup() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [problem, setProblem] = useState("");
  const [message, setMessage] = useState("");
  const [pickupOtp, setPickupOtp] = useState("");

  const load = () => {
    api.get(`/bookings/${id}`).then((res) => setBooking(res.data));
  };

  useEffect(() => {
    load();

    // the server doesn't scope most of these events to a single booking, so on any
    // relevant event we just re-fetch this booking and let the UI settle on the real state.
    // otpGenerated is the one exception - the server sends it directly to this user's
    // room and includes the plaintext otp, so we grab it here instead of just refetching.
    const socket = getSocket();
    const handleUpdate = () => load();
    const handleOtpGenerated = (payload) => {
      if (payload?.bookingId === id && payload.otp) setPickupOtp(payload.otp);
      load();
    };

    socket.on("bookingAssigned", handleUpdate);
    socket.on("otpGenerated", handleOtpGenerated);
    socket.on("garbageCollected", handleUpdate);
    socket.on("truckCapacityUpdated", handleUpdate);

    // kept as a fallback in case a socket event is missed
    const interval = setInterval(load, 15000);

    return () => {
      socket.off("bookingAssigned", handleUpdate);
      socket.off("otpGenerated", handleOtpGenerated);
      socket.off("garbageCollected", handleUpdate);
      socket.off("truckCapacityUpdated", handleUpdate);
      clearInterval(interval);
    };
  }, [id]);

  if (!booking) return <div className="container">Loading...</div>;

  const currentIndex = TIMELINE_STEPS.indexOf(booking.status);

  const submitRating = async () => {
    await api.post(`/bookings/${id}/rate`, { rating, comment });
    setMessage("Thanks for the feedback");
    load();
  };

  const submitProblem = async () => {
    await api.post(`/bookings/${id}/report`, { description: problem });
    setMessage("Problem reported");
    setProblem("");
  };

  return (
    <div className="container">
      <h2>Pickup Status</h2>

      <div className="card">
        <p>Categories: {booking.categories.join(", ")}</p>
        <p>Estimated weight: {booking.estimatedWeight}kg</p>
        {booking.actualWeight && <p>Actual collected weight: {booking.actualWeight}kg</p>}
        {booking.truck && <p>Assigned truck: {booking.truck.vehicleNumber}</p>}
        {booking.driver && <p>Driver: {booking.driver.name}</p>}
        {booking.rewardPointsAwarded > 0 && (
          <p>Reward points earned: {booking.rewardPointsAwarded}</p>
        )}
      </div>

      {booking.status === "OTP_SENT" && pickupOtp && (
        <div className="card">
          <h3>Your pickup OTP</h3>
          <p>Give this code to the driver to confirm collection:</p>
          <p style={{ fontSize: 28, fontWeight: "bold", letterSpacing: 4 }}>{pickupOtp}</p>
        </div>
      )}

      <div className="card">
        <h3>Timeline</h3>
        <ul className="timeline">
          {TIMELINE_STEPS.map((step, i) => (
            <li key={step} className={i <= currentIndex ? "done" : ""}>
              {i <= currentIndex ? "✔" : "○"} {step.replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      </div>

      {booking.status === "COMPLETED" && !booking.rating && (
        <div className="card">
          <h3>Rate this pickup</h3>
          <label>Rating (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          />
          <label>Comment</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          <button onClick={submitRating}>Submit rating</button>
        </div>
      )}

      <div className="card">
        <h3>Report a problem</h3>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Describe the issue"
        />
        <button className="secondary" onClick={submitProblem} disabled={!problem}>
          Report
        </button>
      </div>

      {message && <p className="success">{message}</p>}
    </div>
  );
}