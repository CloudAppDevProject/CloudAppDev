"use client";

import { useState } from "react";
import ImageUploader from "@/app/components/imageUpload";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";

export default function NewItinerary() {
  const router = useRouter();
  const { user } = useUser();

  const [form, setForm] = useState({
    title: "",
    destination: "",
    start_date: "",
    short_desc: "",
    detail_desc: "",
    locations: [
      {
        name: "",
        start_date: "",
        end_date: "",
        short_desc: "",
        images: [],
      },
    ],
  });

  if (!user) {
    router.push("/login");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch("/api/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId: user.id }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create itinerary: ${res.status}`);
      }

      router.push("/"); // zurück zur Übersicht
    } catch (err) {
      console.error("Error adding itinerary:", err);
      alert("Could not save itinerary. Please try again.");
    }
  }

  // Handle location changes
  function handleLocationChange(idx, field, value) {
    setForm((prev) => {
      const locations = [...prev.locations];
      locations[idx][field] = value;
      return { ...prev, locations };
    });
  }

  function handleLocationImagesChange(idx, images) {
    setForm((prev) => {
      const locations = [...prev.locations];
      locations[idx].images = images;
      return { ...prev, locations };
    });
  }

  function addLocation() {
    setForm((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        { name: "", start_date: "", end_date: "", images: [] },
      ],
    }));
  }

  function removeLocation(idx) {
    setForm((prev) => {
      const locations = prev.locations.filter((_, i) => i !== idx);
      return { ...prev, locations };
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans bg-gray shadow-lg rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-primary">
        Add New Itinerary
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <span className="p-float-label">
            <InputText
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full"
              required
            />
            <label htmlFor="title">Title</label>
          </span>
          <span className="p-float-label">
            <InputText
              id="destination"
              value={form.destination}
              onChange={(e) =>
                setForm({ ...form, destination: e.target.value })
              }
              className="w-full"
              required
            />
            <label htmlFor="destination">Destination</label>
          </span>
          <span className="p-float-label">
            <Calendar
              id="start_date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.value })}
              className="w-full"
              dateFormat="yy-mm-dd"
              showIcon
              required
            />
            <label htmlFor="start_date">Start Date</label>
          </span>
          <span className="p-float-label">
            <InputText
              id="short_desc"
              value={form.short_desc}
              onChange={(e) => setForm({ ...form, short_desc: e.target.value })}
              className="w-full"
              maxLength={80}
            />
            <label htmlFor="short_desc">Short Description</label>
          </span>
        </div>

        <span className="p-float-label">
          <InputText
            id="detail_desc"
            value={form.detail_desc}
            onChange={(e) => setForm({ ...form, detail_desc: e.target.value })}
            className="w-full"
          />
          <label htmlFor="detail_desc">Detail Description</label>
        </span>

        {/* Multiple locations section */}
        <div className="space-y-6 bg-gray">
          <h2 className="text-xl font-semibold mb-2 text-primary">Locations</h2>
          {form.locations.map((loc, idx) => (
            <div
              key={idx}
              className="border border-primary/30 rounded-xl p-4 mb-2 bg-gray shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <span className="p-float-label">
                  <InputText
                    id={`loc-name-${idx}`}
                    value={loc.name}
                    onChange={(e) =>
                      handleLocationChange(idx, "name", e.target.value)
                    }
                    className="w-full"
                    required
                  />
                  <label htmlFor={`loc-name-${idx}`}>
                    Location name/address
                  </label>
                </span>
                <span className="p-float-label">
                  <InputText
                    id={`loc-short-desc-${idx}`}
                    value={loc.short_desc}
                    onChange={(e) =>
                      handleLocationChange(idx, "short_desc", e.target.value)
                    }
                    className="w-full"
                    maxLength={80}
                  />
                  <label htmlFor={`loc-short-desc-${idx}`}>
                    Short Description
                  </label>
                </span>
                <span className="p-float-label">
                  <Calendar
                    id={`loc-start-date-${idx}`}
                    value={loc.start_date}
                    onChange={(e) =>
                      handleLocationChange(idx, "start_date", e.value)
                    }
                    className="w-full"
                    dateFormat="yy-mm-dd"
                    showIcon
                    required
                  />
                  <label htmlFor={`loc-start-date-${idx}`}>Start Date</label>
                </span>
                <span className="p-float-label">
                  <Calendar
                    id={`loc-end-date-${idx}`}
                    value={loc.end_date}
                    onChange={(e) =>
                      handleLocationChange(idx, "end_date", e.value)
                    }
                    className="w-full"
                    dateFormat="yy-mm-dd"
                    showIcon
                    required
                  />
                  <label htmlFor={`loc-end-date-${idx}`}>End Date</label>
                </span>
              </div>
              <div>
                <label className="block mb-2 font-semibold text-primary">
                  Upload Images for this location
                </label>
                <ImageUploader
                  maxFiles={5}
                  onUploaded={(imgs) => handleLocationImagesChange(idx, imgs)}
                />
              </div>
              {form.locations.length > 1 && (
                <div className="mt-4">
                  <Button
                    type="button"
                    label="Remove Location"
                    className="p-button-danger"
                    onClick={() => removeLocation(idx)}
                  />
                </div>
              )}
            </div>
          ))}
          <Button
            type="button"
            label="+ Add Location"
            className="p-button-primary"
            onClick={addLocation}
          />
        </div>

        <Button label="Add Itinerary" type="submit" />
      </form>
    </div>
  );
}
