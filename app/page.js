"use client";

import { useEffect, useState } from "react";
import { useUser } from "@context/UserContext";
import { useRouter } from "next/navigation";
import ItineraryTable from "@/app/components/itineraryTable";

export default function MyItinerariesPage() {
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

  // --- Daten laden ---
  useEffect(() => {
    console.log("MyItinerariesPage: usr changed:", user);
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
        let url = `/api/itineraries?userId=${user.id}&page=${page}&limit=${limit}`;
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch itineraries: ${res.status}`);

        const response = await res.json();
        const itinerariesData = response.data || [];
        
        // Fetch likes for each itinerary from Social Service
        const itinerariesWithLikes = await Promise.all(
          itinerariesData.map(async (itinerary) => {
            try {
              // Get like count
              const likesRes = await fetch(`/api/likes?itineraryId=${itinerary.id}`);
              const likesData = await likesRes.json();
              const likeCount = likesData.total || 0;
              
              // Check if current user liked this itinerary
              const userLikedRes = await fetch(`/api/likes?userId=${user.id}&itineraryId=${itinerary.id}`);
              const userLikedData = await userLikedRes.json();
              const userHasLiked = userLikedData.hasLiked || false;
              
              return {
                ...itinerary,
                likeCount,
                userHasLiked,
              };
            } catch (err) {
              console.error(`Failed to fetch likes for itinerary ${itinerary.id}:`, err);
              return {
                ...itinerary,
                likeCount: 0,
                userHasLiked: false,
              };
            }
          })
        );
        
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
        lazy={true}
        first={lazyState.first}
        rows={lazyState.rows}
        totalRecords={totalRecords}
        onPage={onPage}
      />
    </div>
  );
}
