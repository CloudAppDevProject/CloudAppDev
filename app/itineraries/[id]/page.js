"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";

export default function ItineraryDetail() {
  const router = useRouter();
  const { user } = useUser();
  const params = useParams();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/itineraries?id=${params.id}`);
        if (res.status === 404) {
          router.push("/"); // nicht gefunden → zurück zur Übersicht
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch itinerary");

        const data = await res.json();
        setItinerary(data);
      } catch (err) {
        console.error("Error loading itinerary:", err);
        router.push("/"); // Fehler → zurück
      } finally {
        setLoading(false);
      }
    })();
  }, [user, params.id, router]);

  if (loading) return <p>Loading...</p>;

  if (!itinerary) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-4">{itinerary.title}</h1>
      <p className="text-gray-50 mb-2">
        <strong>Destination:</strong> {itinerary.destination}
      </p>
      <p className="text-gray-50 mb-2">
        <strong>Start Date:</strong> {itinerary.start_date}
      </p>
      <p className="text-gray-50 mb-2">
        <strong>Short Description:</strong> {itinerary.short_desc}
      </p>
      <p className="text-gray-50 mb-2">
        <strong>Detail Description:</strong> {itinerary.detail_desc}
      </p>
      <Button
        label="Back"
        onClick={() => router.push("/")}
        severity="secondary"
      />
    </div>
  );
}
