"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const Ctx = createContext({
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
      console.log("Fetching /api/user to get current user");
      const res = await fetch("/api/user", { credentials: "include" });
      const data = await res.json(); // nur einmal!

      console.log("Fetched /api/user, status:", res.status, "data:", data);

      if (res.ok) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
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
    await fetch("/api/user", { method: "DELETE", credentials: "include" });
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, refresh, logout }}>{children}</Ctx.Provider>;
}

export function useUser() {
  return useContext(Ctx);
}
