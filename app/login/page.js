"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";
import { API_SERVICES } from "@/lib/api-config";

// Force dynamic rendering - don't prerender this page at build time
export const dynamic = 'force-dynamic';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useUser();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Login via User Service through API Gateway
      const res = await fetch(`${API_SERVICES.USER_SERVICE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: form.email, password: form.password }),
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Login failed");
      }
      // 4) Context aus Cookie neu laden
      await refresh();

      router.push("/");
    } catch (err) {
      console.error("[Login] Error:", err);
      setError(err.message || "Login failed");
      await refresh(); // Ensures context is reset on error
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Login</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border rounded-lg p-2 w-full"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border rounded-lg p-2 w-full"
          required
        />
        <div className="flex gap-4">
          <Button 
            type="submit" 
            label={isLoading ? 'Logging in...' : 'Login'}
            disabled={isLoading}
          />
          <Button
            type="button"
            onClick={() => router.push("/register")}
            label="Register"
            severity="secondary"
          />
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
    </div>
  );
}
