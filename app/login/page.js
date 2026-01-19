"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";

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
      // Login via Next.js proxy to User Service
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: form.email, password: form.password }),
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        // Provide user-friendly error messages
        let errorMessage = "Login fehlgeschlagen";
        
        if (errData.message) {
          if (Array.isArray(errData.message)) {
            errorMessage = errData.message.join(', ');
          } else if (errData.message.includes('nicht unter dieser Domain registriert')) {
            // Backend already provides German message
            errorMessage = errData.message;
          } else if (errData.message.includes('nicht für diese Domain berechtigt')) {
            // Backend already provides German message for admin
            errorMessage = errData.message;
          } else if (errData.message === 'Invalid credentials') {
            errorMessage = 'Ungültige E-Mail oder Passwort.';
          } else if (errData.message.includes('Tenant not found')) {
            errorMessage = 'Der angeforderte Tenant wurde nicht gefunden.';
          } else if (errData.message.includes('Unable to verify tenant')) {
            errorMessage = 'Die Domain konnte nicht verifiziert werden. Bitte überprüfen Sie die URL.';
          } else {
            errorMessage = errData.message;
          }
        } else if (errData.error) {
          errorMessage = errData.error;
        }
        
        throw new Error(errorMessage);
      }
      // Token aus Response extrahieren und als Cookie setzen
      const data = await res.json();
      // API returns access_token, not token
      const token = data.access_token || data.token;
      if (token) {
        // Cookie für Middleware setzen (z.B. 7 Tage gültig)
        document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
        // Optional: auch weiterhin in localStorage speichern
        localStorage.setItem('access_token', token);
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
