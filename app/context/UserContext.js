"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export const UserContext = createContext({
  user: null,
  avatarUrl: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const isHttp = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
  const isGs = (u) => typeof u === "string" && /^gs:\/\//i.test(u);

  // Fetch a signed URL for private storage paths so the navbar can display the avatar
  const resolveAvatarUrl = useCallback(async (rawUrl) => {
    if (!rawUrl) return null;
    if (isHttp(rawUrl)) return rawUrl;
    if (!isGs(rawUrl)) return null;

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const resp = await fetch(`/api/signed-url?path=${encodeURIComponent(rawUrl)}&service=user`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.url && isHttp(data.url) ? data.url : null;
    } catch (e) {
      console.error("[UserContext] Failed to sign avatar", e);
      return null;
    }
  }, []);

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
        setAvatarUrl(await resolveAvatarUrl(data.user.avatarUrl));
      } else {
        setUser(null);
        setAvatarUrl(null);
        // Clear invalid token
        localStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error("[UserContext] Error fetching user:", error);
      setUser(null);
      setAvatarUrl(null);
    } finally {
      setLoading(false);
    }
  }, [resolveAvatarUrl]);

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
    setAvatarUrl(null);
  }, []);

  return <UserContext.Provider value={{ user, avatarUrl, loading, refresh, logout }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
