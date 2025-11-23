"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import ItineraryTable from "../components/itineraryTable";

export default function AllItinerariesPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [itineraries, setItineraries] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lazyState, setLazyState] = useState({
    first: 0,
    rows: 10,
    page: 1,
  });

  // --- Daten abrufen ---
  useEffect(() => {
    if (userLoading) return;
    if (!user?.id) {
      router.push("/login");
      return;
    }

    const fetchItineraries = async () => {
      setLoading(true);
      try {
        const page = lazyState.page;
        const limit = lazyState.rows;
        let url = `/api/itineraries?page=${page}&limit=${limit}`;
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch itineraries: ${res.status}`);

        const response = await res.json();
        const itinerariesData = response.data || [];

        // Batch fetch likes for all itineraries in one call (instead of 2N calls)
        let itinerariesWithLikes = itinerariesData;
        if (itinerariesData.length > 0) {
          try {
            const itineraryIds = itinerariesData.map((it) => it.id);
            const batchRes = await fetch('/api/likes/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itineraryIds,
                userId: user.id,
              }),
            });

            if (batchRes.ok) {
              const batchData = await batchRes.json();
              itinerariesWithLikes = itinerariesData.map((itinerary) => ({
                ...itinerary,
                likeCount: batchData.counts?.[String(itinerary.id)] || 0,
                userHasLiked: batchData.userLiked?.[String(itinerary.id)] || false,
              }));
            } else {
              // Fallback: set defaults if batch call fails
              console.error('Batch likes fetch failed, using defaults');
              itinerariesWithLikes = itinerariesData.map((itinerary) => ({
                ...itinerary,
                likeCount: 0,
                userHasLiked: false,
              }));
            }
          } catch (err) {
            console.error('Failed to fetch batch likes:', err);
            itinerariesWithLikes = itinerariesData.map((itinerary) => ({
              ...itinerary,
              likeCount: 0,
              userHasLiked: false,
            }));
          }
        }

        setItineraries(itinerariesWithLikes);
        setTotalRecords(response.pagination.total || response.pagination.totalCount || 0);
      } catch (err) {
        console.error("Error fetching itineraries:", err);
        setItineraries([]);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchItineraries, 400);
    return () => clearTimeout(timeout);
  }, [user, search, router, lazyState]);

  // --- Like Update Handler ---
  const handleLikeChange = (itineraryId, newLiked) => {
    setItineraries((prev) =>
      prev.map((item) =>
        item.id === itineraryId
          ? {
              ...item,
              userHasLiked: newLiked,
              likeCount: newLiked ? item.likeCount + 1 : item.likeCount - 1,
            }
          : item
      )
    );
  };

  // --- Navigation ---
  const handleRowClick = (id) => router.push(`/itineraries/${id}`);
  const handleAddNew = () => router.push("/itineraries/new");

  // --- Pagination Handler (for DataTable) ---
  const onPage = (event) => {
    setLazyState({
      first: event.first,
      rows: event.rows,
      page: event.page + 1, // PrimeReact uses 0-based pages, our API uses 1-based
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Itineraries</h1>
        <button onClick={handleAddNew} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
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
        lazy={true}
        first={lazyState.first}
        rows={lazyState.rows}
        totalRecords={totalRecords}
        onPage={onPage}
      />
    </div>
  );
}
