"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Password } from "primereact/password";
import { InputText } from "primereact/inputtext";
import { API_SERVICES } from "@/lib/api-config";

// Force dynamic rendering - don't prerender this page at build time
export const dynamic = 'force-dynamic';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Register via User Service through API Gateway
      const res = await fetch(`${API_SERVICES.USER_SERVICE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: form.email, 
          password: form.password,
          name: form.name 
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(errData.message || "Registration failed");
      }

      const { access_token, user } = await res.json();
      console.log("[Register] User registered:", user);

      // Store JWT token in localStorage
      localStorage.setItem('access_token', access_token);

      // Redirect to home page (user is now logged in)
      setForm({ name: "", email: "", password: "" });
      router.push("/");
    } catch (err) {
      console.error("[Register] Error:", err);
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Register Traveller</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <InputText
            name="username"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mb-6"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-Mail</label>
          <InputText
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <Password
            name="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            feedback={true}
            toggleMask
            className="w-full"
            required
          />
        </div>

        <button 
          type="submit" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
    </div>
  );
}
