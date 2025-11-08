"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

// Force dynamic rendering - don't prerender this page at build time
export const dynamic = 'force-dynamic';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const { refresh } = useUser(); // <-- statt setUser

  useEffect(() => {
    // Check if Firebase is initialized
    if (!auth) {
      setError("Firebase authentication is not available. Please check your configuration.");
      console.error("[Login] Firebase auth is null");
    } else {
      setIsFirebaseReady(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validate Firebase is ready
    if (!auth) {
      setError("Authentication service is not available. Please try again later.");
      return;
    }

    try {
      // 1) Firebase Login
      const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
      // 2) ID Token holen
      const token = await userCred.user.getIdToken();
      // 3) Backend informieren -> setzt HttpOnly-Cookie
      const res = await fetch("/api/user?action=login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: form.email }),
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
      console.error(err);
      setError(err.message || "Login failed");
      await refresh(); // sorgt dafür, dass Context sicher auf null steht
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
            label={isFirebaseReady ? 'Login' : 'Loading...'}
            disabled={!isFirebaseReady}
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
      
      {!isFirebaseReady && !error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">⏳ Initializing authentication service...</span>
        </div>
      )}
    </div>
  );
}
