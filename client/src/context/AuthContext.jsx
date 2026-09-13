import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { getSocket, joinUserRoom } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) joinUserRoom(user.id || user._id);
  }, [user?.id, user?._id]);

  useEffect(() => {
    const socket = getSocket();

    const handleRewardUpdate = (payload) => {
      console.log("rewardPointsUpdated received:", payload); // temp debug log
      setUser((prev) => {
        if (!prev) return prev;
        const prevId = prev.id || prev._id;
        if (String(prevId) !== String(payload.userId)) return prev;

        const updated = { ...prev, rewardPoints: payload.rewardPoints };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });
    };

    socket.on("rewardPointsUpdated", handleRewardUpdate);
    return () => socket.off("rewardPointsUpdated", handleRewardUpdate);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);