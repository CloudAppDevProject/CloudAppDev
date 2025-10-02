"use client";

import { useState } from "react";
import { loginUser } from "@actions/users";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { setUser } = useUser();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const loggedInUser = await loginUser(form);
      setUser(loggedInUser);
      setError("");
      router.push("/");
    } catch (err) {
      setError(err.message);
      setUser(null);
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
        <div className="space-x-4">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            Login
          </button>
          <button type="button" onClick={() => router.push("/register")} className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-500">
            Register
          </button>
        </div>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}
    </div>
  );
}
