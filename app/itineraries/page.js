"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ItineraryTable from ".././components/itineraryTable";

export default function AllItinerariesPage() {
  const router = useRouter();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/api/itineraries`;
        if (globalFilterValue.trim()) {
          url += `?search=${encodeURIComponent(globalFilterValue.trim())}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch itineraries: ${res.status}`);

        const data = await res.json();
        setList(data);
      } catch (err) {
        console.error(err);
        setList([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchData, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const handleRowClick = (event) => router.push(`/itineraries/${event.data.id}`);
  const handleAddNew = () => router.push("/itineraries/new");

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">All Itineraries</h1>

      <ItineraryTable
        list={list}
        loading={loading}
        globalFilterValue={globalFilterValue}
        setGlobalFilterValue={setGlobalFilterValue}
        onRowClick={handleRowClick}
        onAddNew={handleAddNew}
      />
    </div>
  );
}
