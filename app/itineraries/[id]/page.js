"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";
import CommentSection from "@/app/components/CommentSection";
import dynamic from "next/dynamic";

// Dynamisches Laden der Karte (nur Client-Side)
const LocationMap = dynamic(() => import("@/app/components/LocationMap"), {
  ssr: false,
  loading: () => <div className="mb-6 h-[400px] rounded-xl border border-primary/30 flex items-center justify-center">Karte wird geladen...</div>,
});

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
const WeatherPreview = ({ locationName, startDate, endDate }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gefährliche Wettercodes (Gewitter, Schneesturm, Eissturm, starker Wind, etc.)
  const dangerousWeatherCodes = [
    1087, // Thundery outbreaks possible
    1114, // Blowing snow
    1117, // Blizzard
    1135, // Fog
    1147, // Freezing fog
    1150,
    1153,
    1168,
    1171, // Drizzle (freezing)
    1180,
    1183,
    1186,
    1189,
    1192,
    1195,
    1198,
    1201, // Rain (moderate to heavy, freezing)
    1204,
    1207,
    1210,
    1213,
    1216,
    1219,
    1222,
    1225, // Snow (moderate to heavy)
    1237, // Ice pellets
    1240,
    1243,
    1246, // Rain showers (moderate to heavy)
    1249,
    1252, // Sleet showers
    1255,
    1258, // Snow showers (moderate to heavy)
    1261,
    1264, // Ice pellet showers
    1273,
    1276,
    1279,
    1282, // Thunderstorm with rain/snow
  ];

  const weatherAdvice = {
    1087: "Gewitter möglich, bleiben Sie drinnen.",
    1114: "Schneeverwehungen, fahren Sie vorsichtig.",
    1117: "Blizzard, vermeiden Sie Reisen.",
    1135: "Nebel, Sicht eingeschränkt.",
    1147: "Gefrierender Nebel, rutschige Straßen.",
    1150: "Leichter Nieselregen, Regenschirm mitnehmen.",
    1180: "Leichter Regen, Regenschirm empfohlen.",
    1204: "Schneeregen, warme Kleidung tragen.",
    1273: "Gewitter mit Regen, Vorsicht bei Outdoor-Aktivitäten.",
    1153: "Nieselregen, teils gefrierend, Vorsicht auf Straßen.",
    1168: "Gefrierender Nieselregen, hohe Rutschgefahr.",
    1171: "Starker gefrierender Nieselregen, Fahrten vermeiden.",
    1180: "Leichter Regen, Regenschirm empfohlen.",
    1183: "Regen, nasse Straßen einplanen.",
    1186: "Mäßiger Regen, vorsichtig fahren.",
    1189: "Regen, eingeschränkte Sicht möglich.",
    1192: "Starker Regen, Überflutungen möglich.",
    1195: "Sehr starker Regen, unnötige Wege vermeiden.",
    1198: "Gefrierender Regen, Straßen glatt.",
    1201: "Starker gefrierender Regen, hohe Unfallgefahr.",
    1204: "Schneeregen, warme Kleidung tragen.",
    1207: "Starker Schneeregen, schlechte Bedingungen.",
    1210: "Leichter Schneefall, rutschige Wege.",
    1213: "Mäßiger Schneefall, vorsichtig fahren.",
    1216: "Schneefall, Sicht reduziert.",
    1219: "Mäßig starker Schneefall, Verkehrsbehinderungen möglich.",
    1222: "Starker Schneefall, Reisen nach Möglichkeit vermeiden.",
    1225: "Sehr starker Schneefall, Gefahr von Verwehungen.",
    1237: "Eiskörner, rutschige Oberflächen.",
    1240: "Leichte Regenschauer, Regenschutz empfehlenswert.",
    1243: "Mäßige Regenschauer, Straßen glatt.",
    1246: "Heftige Regenschauer, Überflutungsrisiko.",
    1249: "Leichte Schneeregen-Schauer, kaltes Wetter.",
    1252: "Starke Schneeregen-Schauer, schlechte Sicht.",
    1255: "Leichte Schneeschauer, rutschige Wege.",
    1258: "Starke Schneeschauer, Verkehrsbehinderungen.",
    1261: "Leichte Eisregenschauer, Glättegefahr.",
    1264: "Starke Eisregenschauer, Fahrten vermeiden.",
    1273: "Gewitter mit Regen, Vorsicht bei Outdoor-Aktivitäten.",
    1276: "Heftiges Gewitter mit Regen, drinnen bleiben.",
    1279: "Gewitter mit Schnee, schlechte Sicht.",
    1282: "Heftiges Gewitter mit Schnee, Reisen vermeiden.",
  };

  const isWeatherDangerous = (code) => dangerousWeatherCodes.includes(code);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Wenn das Enddatum in der Vergangenheit liegt, zeige kein Wetter
    if (end < today) {
      setLoading(false);
      return;
    }

    // Berechne relevanten Zeitraum: von heute oder Startdatum (was später ist) bis Enddatum
    const relevantStart = start > today ? start : today;
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Wenn das Startdatum mehr als 7 Tage in der Zukunft liegt, zeige kein Wetter
    if (start > sevenDaysFromNow) {
      setLoading(false);
      return;
    }

    // Berechne Anzahl der Tage für die Wettervorhersage (maximal 7)
    const daysUntilEnd = Math.ceil((end - relevantStart) / (1000 * 60 * 60 * 24)) + 1;
    const forecastDays = Math.min(Math.max(daysUntilEnd, 1), 7);

    const fetchWeather = async () => {
      try {
        const response = await fetch(`/api/travel-info/weather?q=${encodeURIComponent(locationName)}&days=${forecastDays}&lang=de`);
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
  }, [locationName, startDate, endDate]);

  if (loading) return <p className="text-sm text-gray-400">Wetter wird geladen...</p>;
  if (!weather || !weather.forecast || weather.forecast.length === 0) return null;

  // Filtere nur die Tage, die im Reisezeitraum liegen
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const relevantForecast = weather.forecast.filter((day) => {
    const forecastDate = new Date(day.date);
    forecastDate.setHours(0, 0, 0, 0);
    return forecastDate >= today && forecastDate >= start && forecastDate <= end;
  });

  if (relevantForecast.length === 0) return null;

  return (
    <div className="mt-3 flex gap-4 overflow-x-auto">
      {relevantForecast.map((day) => {
        const isDangerous = isWeatherDangerous(day.condition.code);
        const advice = weatherAdvice[day.condition.code];
        return (
          <div key={day.date} className="flex-1 min-w-[80px] text-center relative">
            <p className="text-xs text-gray-400 mb-1">{formatDate(day.date)}</p>
            {isDangerous && (
              <div className="relative group">
                <p className="text-xs text-red-400 font-semibold mb-1">⚠️ Warnung</p>
                {advice && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-40 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {advice}
                  </div>
                )}
              </div>
            )}
            <img src={`https:${day.condition.icon}`} alt={day.condition.text} className="w-12 h-12 mx-auto" />
            <p className="font-semibold">{day.maxtemp_c}°C</p>
            <p className="text-xs text-gray-400">{day.mintemp_c}°C</p>
            <p className="text-xs text-gray-300 mt-1">{day.condition.text}</p>
          </div>
        );
      })}
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
        const res = await apiFetch(`/api/itineraries?id=${params.id}&currentUserId=${user.id}`);
        if (res.status === 404) {
          router.push("/");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch itinerary");

        const data = await res.json();

        try {
          const likesRes = await apiFetch(`/api/likes?itineraryId=${data.id}`);
          const likesData = await likesRes.json();
          data.likeCount = likesData.total || 0;

          const userLikedRes = await apiFetch(`/api/likes?userId=${user.id}&itineraryId=${data.id}`);
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
              let updatedLoc = { ...loc };
              
              // Koordinaten abrufen, wenn nicht vorhanden
              if (!loc.latitude || !loc.longitude) {
                try {
                  const coordsRes = await fetch(`/api/travel-info/location/coordinates?name=${encodeURIComponent(loc.name)}`);
                  if (coordsRes.ok) {
                    const coords = await coordsRes.json();
                    if (coords && coords.lat && coords.lon) {
                      updatedLoc.latitude = parseFloat(coords.lat);
                      updatedLoc.longitude = parseFloat(coords.lon);

                      // Koordinaten in der Datenbank speichern (async, ohne zu warten)
                      fetch(`/api/itineraries/locations/${loc.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ latitude: parseFloat(coords.lat), longitude: parseFloat(coords.lon) }),
                      }).catch((e) => console.error("Failed to save coordinates:", e));
                    }
                  }
                } catch (e) {
                  // kein Fehler, da keine Koordinaten gefunden wurden
                }
              }
              
              if (Array.isArray(updatedLoc.images)) {
                const signedImages = await Promise.all(
                  updatedLoc.images.map(async (url) => {
                    if (url.startsWith("gs://")) {
                      try {
                        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
                        const resp = await fetch(`/api/signed-url?path=${encodeURIComponent(url)}&service=itinerary`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                        });
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
                updatedLoc.images = signedImages;
              }
              return updatedLoc;
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

          {/* Interaktive Karte mit klickbaren Markern */}
          <LocationMap locations={itinerary.locations} />

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
              {(
                <p className="mb-1"> 
                  <strong>Coordinates:</strong> {loc.latitude}, {loc.longitude}
                </p>
              )}

              {/* Wettervorschau */}
              <WeatherPreview locationName={loc.name} startDate={loc.start_date} endDate={loc.end_date} />

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
