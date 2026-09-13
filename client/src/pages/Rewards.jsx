import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function Rewards() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.get("/rewards/transactions").then((res) => setTransactions(res.data));
  }, []);

  return (
    <div className="container">
      <h2>Rewards</h2>
      <div className="stat-box" style={{ maxWidth: 200 }}>
        <div className="number">{user?.rewardPoints}</div>
        <div>points balance</div>
      </div>

      <h3>Transaction history</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Points</th>
            <th>Note</th>
            <th>Balance after</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t._id}>
              <td>{new Date(t.createdAt).toLocaleDateString()}</td>
              <td>{t.type}</td>
              <td>{t.points}</td>
              <td>{t.note}</td>
              <td>{t.balanceAfter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
