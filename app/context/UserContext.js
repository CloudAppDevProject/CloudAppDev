"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export const UserContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.log("[UserContext] No access token found");
        setUser(null);
        setLoading(false);
        return;
      }

      console.log("[UserContext] Fetching /api/user with token");
      const res = await fetch("/api/user", { 
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      console.log("[UserContext] Fetched /api/user, status:", res.status);

      if (res.ok && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        // Clear invalid token
        localStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error("[UserContext] Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const refresh = useCallback(fetchMe, [fetchMe]);

  const logout = useCallback(async () => {
    // Clear JWT token from localStorage
    localStorage.removeItem('access_token');
    // Notify backend (optional)
    await fetch("/api/user?action=logout", { method: "POST" });
    setUser(null);
  }, []);

  return <UserContext.Provider value={{ user, loading, refresh, logout }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
