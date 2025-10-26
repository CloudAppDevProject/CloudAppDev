"use client";

import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import ImageUploader from "./imageUpload";

export default function ProfileForm({ user, onUpdate }) {
  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    password: "",
    avatarUrl: user.avatarUrl || "", // <-- Feld für Avatar-URL
  });
  const [preview, setPreview] = useState(user.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }; // uploadedFiles ist ein Array von URLs, zurückgegeben vom ImageUploader

  const handleImageUpload = async (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const uploadedImageUrl = uploadedFiles[0]; // erste URL
    setPreview(uploadedImageUrl);
    setForm((prev) => ({ ...prev, avatarUrl: uploadedImageUrl }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        userId: user.id,
        username: form.username,
        email: form.email, // Sende die NEUE GCS URI (oder die alte) an die API
        avatarUrl: form.avatarUrl,
      };

      if (form.password) {
        payload.password = form.password;
      }

      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      const data = await res.json();
      onUpdate(data);
      setMessage("Profile updated successfully");
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ... (Inputfelder) */}
      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <InputText name="username" value={form.username} onChange={handleChange} className="w-full" />{" "}
      </div>{" "}
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <InputText name="email" type="email" value={form.email} onChange={handleChange} className="w-full" />{" "}
      </div>{" "}
      <div>
        <label className="block text-sm font-medium mb-1">New Password</label>
        <Password name="password" value={form.password} onChange={handleChange} feedback={true} toggleMask className="w-full" />{" "}
      </div>{" "}
      <div>
        <label className="block text-sm font-medium mb-1">Profilbild hochladen</label>
        <ImageUploader maxFiles={1} onUploaded={handleImageUpload} />{" "}
      </div>
      <Button type="submit" label={loading ? "Speichert..." : "Änderungen speichern"} className="w-full" disabled={loading} />{" "}
    </form>
  );
}
