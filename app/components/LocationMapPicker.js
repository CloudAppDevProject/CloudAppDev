"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix für Default Marker Icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Komponente für Klick-Events auf der Karte
function MapClickHandler({ onLocationClick }) {
  useMapEvents({
    click: (e) => {
      onLocationClick(e.latlng);
    },
  });
  return null;
}

export default function LocationMapPicker({ initialPosition, onLocationSelect }) {
  const [position, setPosition] = useState(initialPosition || [51.1657, 10.4515]); // Deutschland Zentrum als Default

  const handleMapClick = (latlng) => {
    const newPos = [latlng.lat, latlng.lng];
    setPosition(newPos);
    if (onLocationSelect) {
      onLocationSelect({ latitude: latlng.lat, longitude: latlng.lng });
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-primary/30" style={{ height: "300px" }}>
      <MapContainer center={position} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationClick={handleMapClick} />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}
