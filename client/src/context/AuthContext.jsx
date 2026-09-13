import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { getSocket, joinUserRoom } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");

    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  // Join the logged-in user's Socket.IO room
  useEffect(() => {
    if (user) {
      joinUserRoom(user.id || user._id);
    }
  }, [user]);

  // Listen for reward point updates
  useEffect(() => {
    const socket = getSocket();

    const handleRewardUpdate = (payload) => {
      console.log("rewardPointsUpdated received:", payload);

      setUser((prev) => {
        if (!prev) return prev;

        const prevId = prev.id || prev._id;

        if (String(prevId) !== String(payload.userId)) {
          return prev;
        }

        const updated = {
          ...prev,
          rewardPoints: payload.rewardPoints,
        };

        localStorage.setItem("user", JSON.stringify(updated));

        return updated;
      });
    };

    socket.on("rewardPointsUpdated", handleRewardUpdate);

    return () => {
      socket.off("rewardPointsUpdated", handleRewardUpdate);
    };
  }, []);

  // LOGIN
  const login = async (email, password) => {
    const { data } = await api.post("/api/auth/login", {
      email,
      password,
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    }

    return data.user;
  };

  // REGISTER
  const register = async (payload) => {
    const { data } = await api.post("/api/auth/register", payload);

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    }

    return data.user;
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);