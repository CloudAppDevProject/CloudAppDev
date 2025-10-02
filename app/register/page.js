"use client";

import { useState } from "react";
import { registerUser, getUsers } from "@actions/users";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [users, setUsers] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    await registerUser(form);
    setForm({ name: "", email: "", password: "" });
    setUsers(await getUsers());
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Register Traveller</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg p-2 w-full" required />
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
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Register
        </button>
      </form>

      <h2 className="text-2xl font-semibold mb-4">Registered Travellers</h2>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id} className="border rounded-lg p-2">
            {user.name} — {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
