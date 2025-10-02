"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getItineraries } from "@actions/itineraries";
import { useUser } from "@context/UserContext";

export default function ItineraryDetail() {
  const router = useRouter();
  const { user } = useUser();
  const params = useParams();
  const [itinerary, setItinerary] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    (async () => {
      const data = await getItineraries(user.id);
      const item = data.find((i) => i.id === parseInt(params.id, 10));
      if (!item) {
        router.push("/"); // Nicht gefunden → zurück zur Übersicht
      } else {
        setItinerary(item);
      }
    })();
  }, [user, params.id]);

  if (!itinerary) return <p>Loading...</p>;

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
      <button onClick={() => router.push("/")} className="mt-4 bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-500">
        Back
      </button>
    </div>
  );
}
