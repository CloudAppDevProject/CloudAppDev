"use client";

import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import ImageUploader from "./imageUpload";

export default function ProfileForm({ user, onUpdate }) {
  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    password: "",
    image: user.image || "",
  });
  const [preview, setPreview] = useState(user.image || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setForm({ ...form, imageFile: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("username", form.username);
      formData.append("email", form.email);
      if (form.password) formData.append("password", form.password);
      if (form.imageFile) formData.append("image", form.imageFile);

      const res = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
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
      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <InputText name="username" value={form.username} onChange={handleChange} className="w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <InputText name="email" type="email" value={form.email} onChange={handleChange} className="w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">New Password</label>
        <Password name="password" value={form.password} onChange={handleChange} feedback={true} toggleMask className="w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Profilbild hochladen</label>
        <ImageUploader maxFiles={1} onUploaded={handleImageUpload} />
      </div>

      <Button type="submit" label={loading ? "Speichert..." : "Änderungen speichern"} className="w-full" disabled={loading} />

      {message && <p className="text-center mt-3">{message}</p>}
    </form>
  );
}
