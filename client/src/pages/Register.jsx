import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await register(form);

      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);

      const message =
        err.response?.data?.message ||
        err.message ||
        "Registration failed";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400 }}>
      <h2>Register</h2>

      <form onSubmit={handleSubmit} className="card">
        <label htmlFor="name">Full name</label>

        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your full name"
          autoComplete="name"
          required
          disabled={loading}
        />

        <label htmlFor="email">Email</label>

        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          autoComplete="email"
          required
          disabled={loading}
        />

        <label htmlFor="phone">Phone</label>

        <input
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="Enter your phone number"
          autoComplete="tel"
          required
          disabled={loading}
        />

        <label htmlFor="password">Password</label>

        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Create a password"
          autoComplete="new-password"
          required
          disabled={loading}
        />

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p>
        Already have an account?{" "}
        <Link to="/login">
          Login
        </Link>
      </p>
    </div>
  );
}