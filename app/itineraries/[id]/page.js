"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";
import CommentSection from "@/app/components/CommentSection";
import { API_SERVICES } from "@/lib/api-config";

// HILFSFUNKTION: Datum formatieren
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).format(date);
  } catch (error) {
    console.error("Datum Formatierungsfehler:", error);
    return dateString;
  }
};

// Wetterkomponente für eine Location
const WeatherPreview = ({ locationName, startDate }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prüfe ob das Startdatum innerhalb der nächsten 3 Tage liegt
    if (!startDate) return;
    
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    // Wenn das Startdatum mehr als 3 Tage in der Zukunft liegt, zeige kein Wetter
    if (start > threeDaysFromNow) {
      setLoading(false);
      return;
    }

    const fetchWeather = async () => {
      try {
        const response = await fetch(`${API_SERVICES.TRAVEL_INFO_SERVICE}/weather?q=${encodeURIComponent(locationName)}&days=3&lang=de`);
        if (response.ok) {
          const data = await response.json();
          setWeather(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden des Wetters:", error);
      } finally {
        setLoading(false);
      }
    };

    if (locationName) {
      fetchWeather();
    }
  }, [locationName, startDate]);

  if (loading) return <p className="text-sm text-gray-400">Wetter wird geladen...</p>;
  if (!weather || !weather.forecast || weather.forecast.length === 0) return null;

  return (
    <div className="mt-3 flex gap-4">
      {weather.forecast.slice(0, 3).map((day) => (
        <div key={day.date} className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">{formatDate(day.date)}</p>
          <img 
            src={`https:${day.condition.icon}`} 
            alt={day.condition.text}
            className="w-12 h-12 mx-auto"
          />
          <p className="font-semibold">{day.maxtemp_c}°C</p>
          <p className="text-xs text-gray-400">{day.mintemp_c}°C</p>
          <p className="text-xs text-gray-300 mt-1">{day.condition.text}</p>
        </div>
      ))}
    </div>
  );
};

export default function ItineraryDetail() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const params = useParams();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/itineraries?id=${params.id}&currentUserId=${user.id}`);
        if (res.status === 404) {
          router.push("/");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch itinerary");

        const data = await res.json();

        try {
          const likesRes = await fetch(`/api/likes?itineraryId=${data.id}`);
          const likesData = await likesRes.json();
          data.likeCount = likesData.total || 0;

          const userLikedRes = await fetch(`/api/likes?userId=${user.id}&itineraryId=${data.id}`);
          const userLikedData = await userLikedRes.json();
          data.userHasLiked = userLikedData.hasLiked || false;
        } catch (err) {
          console.error("Failed to fetch likes:", err);
          data.likeCount = 0;
          data.userHasLiked = false;
        }

        if (Array.isArray(data.locations)) {
          const locationsWithSignedImages = await Promise.all(
            data.locations.map(async (loc) => {
              if (Array.isArray(loc.images)) {
                const signedImages = await Promise.all(
                  loc.images.map(async (url) => {
                    if (url.startsWith("gs://")) {
                      try {
                        const resp = await fetch(`${API_SERVICES.ITINERARY_SERVICE}/signed-url?path=${encodeURIComponent(url)}`);
                        if (resp.ok) {
                          const { url: signedUrl } = await resp.json();
                          return signedUrl;
                        }
                      } catch (e) {
                        return url.replace("gs://", "https://storage.googleapis.com/");
                      }
                      return url.replace("gs://", "https://storage.googleapis.com/");
                    }
                    return url;
                  })
                );
                return { ...loc, images: signedImages };
              }
              return loc;
            })
          );
          data.locations = locationsWithSignedImages;
        }

        setItinerary(data);
      } catch (err) {
        console.error("Error loading itinerary:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, params.id, router]);

  if (loading) return <p>Loading...</p>;

  if (!itinerary) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-4">🗺️ {itinerary.title}</h1>
      <p className="text-gray-50 mb-2">
        <strong>Destination:</strong> {itinerary.destination}
      </p>
      <p className="text-gray-50 mb-2">
        <strong>Start Date:</strong> {formatDate(itinerary.start_date)}
      </p>
      <p className="text-gray-50 mb-2">
        <strong>Short Description:</strong> {itinerary.short_desc}
      </p>
      <p className="text-gray-50 mb-2">
        <strong>Detail Description:</strong> {itinerary.detail_desc}
      </p>

      {Array.isArray(itinerary.locations) && itinerary.locations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 text-primary">📍 Locations</h2>
          {itinerary.locations.map((loc, idx) => (
            <div key={idx} className="border border-primary/30 rounded-xl p-4 mb-4 bg-gray shadow-sm">
              <h3 className="text-lg font-bold mb-2">{loc.name}</h3>
              <p className="mb-1">
                <strong>Short Description:</strong> {loc.short_desc}
              </p>
              <p className="mb-1">
                <strong>Start Date:</strong> {formatDate(loc.start_date)}
              </p>
              <p className="mb-1">
                <strong>End Date:</strong> {formatDate(loc.end_date)}
              </p>

              {/* Wettervorschau */}
              <WeatherPreview locationName={loc.name} startDate={loc.start_date} />

              {loc.images && loc.images.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-2">
                  {loc.images.map((imgUrl, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <img src={imgUrl} alt={`Location ${idx + 1} Image ${i + 1}`} className="rounded shadow" style={{ width: 200, height: 200, objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button label="Back" onClick={() => router.push("/")} severity="secondary" className="mt-6" />

      <CommentSection itineraryId={itinerary.id} currentUser={user} />
    </div>
  );
}
