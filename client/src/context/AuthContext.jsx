import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { getSocket, joinUserRoom } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");

    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  // --------------------------------------------------
  // Refresh logged-in user from backend
  // --------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    const loadCurrentUser = async () => {
      try {
        const { data } = await api.get("/auth/me");

        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);
      } catch (error) {
        console.error("Failed to restore session:", error);

        // Token is invalid/expired
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }
    };

    loadCurrentUser();
  }, []);

  // --------------------------------------------------
  // Join user's Socket.IO room
  // --------------------------------------------------

  useEffect(() => {
    if (!user) return;

    const userId = user.id || user._id;

    if (userId) {
      joinUserRoom(userId);
    }
  }, [user]);

  // --------------------------------------------------
  // Reward updates
  // --------------------------------------------------

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

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);

    return data.user;
  };

  // --------------------------------------------------
  // REGISTER
  // --------------------------------------------------

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);

    return data.user;
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

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