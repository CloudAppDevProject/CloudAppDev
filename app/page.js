"use client";

import { useEffect, useState } from "react";
import { getItineraries } from "@actions/itineraries";
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

  useEffect(() => {
    (async () => {
      const data = await getItineraries(user.id);
      setList(data);
    })();
  }, [user.id]);

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      {/* Header mit Plus-Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Itineraries</h1>
        <button onClick={() => router.push("/itineraries/new")} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-lg" title="Add new itinerary">
          +
        </button>
      </div>

      {list.length === 0 ? (
        <p>No itineraries found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr>
                <th className="border px-4 py-2 text-left">Title</th>
                <th className="border px-4 py-2 text-left">Destination</th>
                <th className="border px-4 py-2 text-left">Start Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800 cursor-pointer" onClick={() => router.push(`/itineraries/${item.id}`)}>
                  <td className="border px-4 py-2">{item.title}</td>
                  <td className="border px-4 py-2">{item.destination}</td>
                  <td className="border px-4 py-2">{item.start_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
