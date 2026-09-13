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

  // Whether we've finished checking the token/role against the backend at
  // least once. Until this is true, ProtectedRoute should wait rather than
  // trust (or distrust) the cached localStorage user.
  const [authChecked, setAuthChecked] = useState(false);

  // On every app load, re-validate against the backend instead of trusting
  // whatever role/user object happens to be sitting in localStorage. The
  // backend is the source of truth for role (see middleware/auth.js), so a
  // stale or tampered local object should never be able to grant access.
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setAuthChecked(true);
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        const freshUser = data.user || data;
        localStorage.setItem("user", JSON.stringify(freshUser));
        setUser(freshUser);
      })
      .catch(() => {
        // token invalid/expired/user blocked - drop the stale session
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

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
    const { data } = await api.post("/auth/login", {
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

    setAuthChecked(true);

    return data.user;
  };

  // REGISTER
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    }

    setAuthChecked(true);

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
        authChecked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);