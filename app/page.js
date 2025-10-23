"use client";

import { useEffect, useState } from "react";
import { useUser } from "@context/UserContext";
import { useRouter } from "next/navigation";
import ItineraryTable from "./components/itineraryTable";

export default function MyItinerariesPage() {
  const router = useRouter();
  const { user } = useUser();

  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // --- Daten laden ---
  useEffect(() => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    const fetchItineraries = async () => {
      setLoading(true);
      try {
        let url = `/api/itineraries?userId=${user.id}&currentUserId=${user.id}`;
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch itineraries: ${res.status}`);

        const data = await res.json();
        setItineraries(data);
      } catch (err) {
        console.error("Error fetching itineraries:", err);
        setItineraries([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchItineraries, 400);
    return () => clearTimeout(timeout);
  }, [user, search, router]);

  // --- Like Status aktualisieren ---
  const handleLikeChange = (itineraryId, newLiked) => {
    setItineraries((prev) =>
      prev.map((item) =>
        item.id === itineraryId
          ? {
              ...item,
              userHasLiked: newLiked,
              likeCount: newLiked
                ? item.likeCount + 1
                : item.likeCount - 1,
            }
          : item
      )
    );
  };

  // --- Zeileninteraktion ---
  const handleRowClick = (id) => router.push(`/itineraries/${id}`);
  const handleAddNew = () => router.push("/itineraries/new");

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Itineraries</h1>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + Add New
        </button>
      </div>

      <ItineraryTable
        itineraries={itineraries}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        userId={user?.id}
        onRowClick={handleRowClick}
        onLikeChange={handleLikeChange}
      />
    </div>
  );
}
