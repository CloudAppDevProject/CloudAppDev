"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addItinerary } from "@actions/itineraries";
import { useUser } from "@context/UserContext";

export default function NewItinerary() {
  const router = useRouter();
  const { user } = useUser();

  const [form, setForm] = useState({
    title: "",
    destination: "",
    start_date: "",
    short_desc: "",
    detail_desc: "",
  });

  if (!user) {
    router.push("/login");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await addItinerary({ ...form, userId: user.id });
    router.push("/"); // Zurück zur Übersicht
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Add New Itinerary</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border rounded-lg p-2 w-full"
            required
          />
          <input
            type="text"
            placeholder="Destination"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="border rounded-lg p-2 w-full"
            required
          />
          <input
            type="date"
            placeholder="Start Date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="border rounded-lg p-2 w-full"
            required
          />
          <input
            type="text"
            placeholder="Short Description"
            value={form.short_desc}
            onChange={(e) => setForm({ ...form, short_desc: e.target.value })}
            className="border rounded-lg p-2 w-full"
            maxLength={80}
          />
        </div>

        <textarea
          placeholder="Detail Description"
          value={form.detail_desc}
          onChange={(e) => setForm({ ...form, detail_desc: e.target.value })}
          className="border rounded-lg p-2 w-full"
        />

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Add Itinerary
        </button>
      </form>
    </div>
  );
}
