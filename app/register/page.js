"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Password } from "primereact/password";
import { InputText } from "primereact/inputtext";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      console.log("Submitting registration:", form);
      const res = await fetch("/api/user?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Registration failed");
      }

      await res.json();
      setForm({ name: "", email: "", password: "" });
      setError("");
      router.push("/login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Register Traveller</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <InputText name="username" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mb-6" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-Mail</label>
          <InputText name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <Password name="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} feedback={true} toggleMask className="w-full" />
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Register
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
