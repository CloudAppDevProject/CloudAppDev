"use client";

import { useEffect, useState } from "react";
import { getItineraries, addItinerary, updateItinerary, deleteItinerary } from "@actions/itineraries";
import { useUser } from "@context/UserContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  if (!user) {
    router.push("/login");
    return null;
  }

  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    title: "",
    destination: "",
    start_date: "",
    short_desc: "",
    detail_desc: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await getItineraries(user.id);
      setList(data);
    })();
  }, [user.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      await updateItinerary({ id: editingId, ...form, userId: user.id });
      setEditingId(null);
    } else {
      await addItinerary({ ...form, userId: user.id });
    }
    setForm({
      title: "",
      destination: "",
      start_date: "",
      short_desc: "",
      detail_desc: "",
    });
    setList(await getItineraries(user.id));
  }

  async function handleDelete(id) {
    await deleteItinerary({ id, userId: user.id });
    setList(await getItineraries(user.id));
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Itinerary Manager</h1>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border rounded-lg p-2 w-full" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input
            className="border rounded-lg p-2 w-full"
            placeholder="Destination"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            required
          />
          <input type="date" className="border rounded-lg p-2 w-full" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
          <input
            className="border rounded-lg p-2 w-full"
            placeholder="Short description"
            value={form.short_desc}
            onChange={(e) => setForm({ ...form, short_desc: e.target.value })}
            maxLength={80}
          />
        </div>
        <textarea
          className="border rounded-lg p-2 w-full"
          placeholder="Detail description"
          value={form.detail_desc}
          onChange={(e) => setForm({ ...form, detail_desc: e.target.value })}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          {editingId ? "Update" : "Add"} Itinerary
        </button>
      </form>

      <h2 className="text-2xl font-semibold mb-4">Planned itineraries</h2>
      <ul className="space-y-4">
        {list.map((item) => (
          <li key={item.id} className="border rounded-lg p-4 flex justify-between items-start">
            <div>
              <div className="font-semibold text-lg">
                {item.title} - {item.destination}
              </div>
              <div className="text-sm text-gray-500">{item.start_date}</div>
              <p className="mt-1 text-gray-700">{item.short_desc}</p>
              <p className="mt-2 text-gray-700">{item.detail_desc}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => startEdit(item)} className="bg-yellow-500 text-white px-3 py-1 rounded-lg">
                Edit
              </button>
              <button onClick={() => handleDelete(item.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
