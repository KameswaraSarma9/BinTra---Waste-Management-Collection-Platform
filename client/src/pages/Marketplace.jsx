import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function Marketplace() {
  const { user, setUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api.get("/products").then((res) => setProducts(res.data));
  };

  useEffect(load, []);

  const redeem = async (product) => {
    setMessage("");
    setError("");
    try {
      await api.post("/orders", { productId: product._id, quantity: 1 });
      setMessage(`Redeemed ${product.productName}`);
      const updatedUser = { ...user, rewardPoints: user.rewardPoints - product.pointsRequired };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to redeem product");
    }
  };

  return (
    <div className="container">
      <h2>Marketplace</h2>
      <p>Your balance: <strong>{user?.rewardPoints} points</strong></p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="grid">
        {products.map((p) => (
          <div className="card" key={p._id}>
            <h3>{p.productName}</h3>
            <p>{p.description}</p>
            <p>Material: {p.materialUsed}</p>
            <p>Stock: {p.stock}</p>
            <p><strong>{p.pointsRequired} points</strong></p>
            <button
              onClick={() => redeem(p)}
              disabled={p.status !== "ACTIVE" || !user || user.rewardPoints < p.pointsRequired}
            >
              {p.status !== "ACTIVE" ? "Out of stock" : "Redeem"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
