"use client";

import { useState, useCallback } from "react";
import ImageUploader from "@/app/components/imageUpload";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";

// Force dynamic rendering - don't prerender this page at build time
export const dynamic = 'force-dynamic';

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
        images: [], // { url, signed_url }
      },
    ],
  });

  if (!user) {
    router.push("/login");
    return null;
  }

  /** Helper: check URL type */
  const isHttp = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
  const isGs = (u) => typeof u === "string" && /^gs:\/\//i.test(u);

  /** Get signed URL from /api/image */
  const getSignedUrl = async (url) => {
    try {
      const resp = await fetch(`/api/image?path=${encodeURIComponent(url)}`);
      if (!resp.ok) throw new Error("signing failed");
      const data = await resp.json();
      const signed = data?.url;
      return isHttp(signed) ? signed : null;
    } catch (e) {
      console.error("Signing failed for", url, e);
      return null;
    }
  };

  /** Sign one uploaded image and return shape { url, signed_url } */
  const signOne = async (url) => {
    if (!url) return null;
    if (isHttp(url)) {
      return { url, signed_url: url }; // already public
    }
    if (isGs(url)) {
      const signed = await getSignedUrl(url);
      if (signed) return { url, signed_url: signed };
      return null;
    }
    return null;
  };

  /** Handle images after upload */
  const handleLocationImagesChange = useCallback(async (idx, imgs) => {
    const rawUrls = (imgs || [])
      .map((x) => {
        if (!x) return null;
        if (typeof x === "string") return x;
        return x.url || x.path || x.gsUrl || x.storagePath || null;
      })
      .filter(Boolean);

    const signedImages = (await Promise.all(rawUrls.map(signOne))).filter(Boolean);

    setForm((prev) => {
      const locations = [...prev.locations];
      locations[idx].images = signedImages;
      return { ...prev, locations };
    });
  }, []);

  function handleLocationChange(idx, field, value) {
    setForm((prev) => {
      const locations = [...prev.locations];
      locations[idx] = { ...locations[idx], [field]: value };
      return { ...prev, locations };
    });
  }

  function addLocation() {
    setForm((prev) => ({
      ...prev,
      locations: [...prev.locations, { name: "", start_date: "", end_date: "", short_desc: "", images: [] }],
    }));
  }

  function removeLocation(idx) {
    setForm((prev) => {
      const locations = prev.locations.filter((_, i) => i !== idx);
      return { ...prev, locations };
    });
  }

  function sanitizeForSubmit(form, userId) {
    return {
      ...form,
      userId,
      locations: (form.locations || []).map((loc) => ({
        ...loc,
        // keep the same shape but drop signed_url
        images: Array.isArray(loc.images)
          ? loc.images
              .map((img) => {
                if (!img) return null;
                // if uploader provided a string, keep it as { url }
                if (typeof img === "string") return img;
                if (typeof img === "object" && img.url) return img.url;
                return null;
              })
              .filter(Boolean)
          : [],
      })),
    };
  }

  // replace your current handleSubmit with this version
  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const payload = sanitizeForSubmit(form, user.id); // <- signed_url removed

      const res = await fetch("/api/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to create itinerary: ${res.status}`);
      }

      router.push("/");
    } catch (err) {
      console.error("Error adding itinerary:", err);
      alert("Could not save itinerary. Please try again.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans bg-gray shadow-lg rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-primary">Add New Itinerary</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <span className="p-float-label">
            <InputText id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" required />
            <label htmlFor="title">Title</label>
          </span>

          <span className="p-float-label">
            <InputText id="destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full" required />
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
            <InputText id="short_desc" value={form.short_desc} onChange={(e) => setForm({ ...form, short_desc: e.target.value })} className="w-full" maxLength={80} />
            <label htmlFor="short_desc">Short Description</label>
          </span>
        </div>

        <span className="p-float-label">
          <InputText id="detail_desc" value={form.detail_desc} onChange={(e) => setForm({ ...form, detail_desc: e.target.value })} className="w-full" />
          <label htmlFor="detail_desc">Detail Description</label>
        </span>

        {/* Locations */}
        <div className="space-y-6 bg-gray">
          <h2 className="text-xl font-semibold mb-2 text-primary">Locations</h2>

          {form.locations.map((loc, idx) => (
            <div key={idx} className="border border-primary/30 rounded-xl p-4 mb-2 bg-gray shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <span className="p-float-label">
                  <InputText id={`loc-name-${idx}`} value={loc.name} onChange={(e) => handleLocationChange(idx, "name", e.target.value)} className="w-full" required />
                  <label htmlFor={`loc-name-${idx}`}>Location name/address</label>
                </span>

                <span className="p-float-label">
                  <InputText
                    id={`loc-short-desc-${idx}`}
                    value={loc.short_desc || ""}
                    onChange={(e) => handleLocationChange(idx, "short_desc", e.target.value)}
                    className="w-full"
                    maxLength={80}
                  />
                  <label htmlFor={`loc-short-desc-${idx}`}>Short Description</label>
                </span>

                <span className="p-float-label">
                  <Calendar
                    id={`loc-start-date-${idx}`}
                    value={loc.start_date}
                    onChange={(e) => handleLocationChange(idx, "start_date", e.value)}
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
                    onChange={(e) => handleLocationChange(idx, "end_date", e.value)}
                    className="w-full"
                    dateFormat="yy-mm-dd"
                    showIcon
                    required
                  />
                  <label htmlFor={`loc-end-date-${idx}`}>End Date</label>
                </span>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-primary">Upload Images for this location</label>

                <ImageUploader maxFiles={5} onUploaded={(imgs) => handleLocationImagesChange(idx, imgs)} />
              </div>

              {/* Preview signed URLs only */}
              {Array.isArray(loc.images) && loc.images.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {loc.images
                    .filter((img) => img?.signed_url)
                    .map((img, i) => (
                      <div key={`${idx}-${i}`} className="w-[140px] h-[140px] overflow-hidden rounded-lg shadow">
                        <img
                          src={img.signed_url}
                          alt={`Preview ${i + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    ))}
                </div>
              )}

              {form.locations.length > 1 && (
                <div className="mt-4">
                  <Button type="button" label="Remove Location" className="p-button-danger" onClick={() => removeLocation(idx)} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <Button type="button" label="Add Location" className="p-button-secondary" onClick={addLocation} />

          <Button label="Add Itinerary" type="submit" />
        </div>
      </form>
    </div>
  );
}
