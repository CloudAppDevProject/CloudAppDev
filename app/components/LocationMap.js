"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix für Default Marker Icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Komponente zum automatischen Anpassen der Karten-Bounds
function MapBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = locations.map((loc) => [parseFloat(loc.latitude), parseFloat(loc.longitude)]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);

  return null;
}

export default function LocationMap({ locations }) {
  const locationsWithCoords = locations.filter((loc) => loc.latitude && loc.longitude);

  if (locationsWithCoords.length === 0) {
    return null;
  }

  // Berechne Zentrum
  const avgLat = locationsWithCoords.reduce((sum, loc) => sum + parseFloat(loc.latitude), 0) / locationsWithCoords.length;
  const avgLon = locationsWithCoords.reduce((sum, loc) => sum + parseFloat(loc.longitude), 0) / locationsWithCoords.length;

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-primary/30" style={{ height: "400px" }}>
      <MapContainer center={[avgLat, avgLon]} zoom={10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds locations={locationsWithCoords} />
        {locationsWithCoords.map((loc, idx) => (
          <Marker key={idx} position={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-1">{loc.name}</h3>
                <p className="text-sm mb-1">{loc.short_desc}</p>
                <p className="text-xs text-gray-600">
                  {loc.start_date && loc.end_date && (
                    <>
                      {new Date(loc.start_date).toLocaleDateString('de-DE')} - {new Date(loc.end_date).toLocaleDateString('de-DE')}
                    </>
                  )}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
