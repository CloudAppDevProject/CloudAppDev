"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Hinzugefügt: Router für Navigation nach Logout
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import ImageUploader from "./imageUpload";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function ProfileForm({ user, onUpdate }) {
  const router = useRouter();

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
  };

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
        email: form.email,
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // router.push("/login"); // Leitet zur Login-Seite weiter
    } catch (error) {
      console.error("Logout Error:", error);
      setMessage("Error logging out.");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">My Profile</h1>

        <Button type="button" label="Logout" icon="pi pi-sign-out" onClick={handleLogout} className="p-button-danger" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <img
            src={preview || "https://placehold.co/100x100/3B82F6/ffffff?text=U"}
            alt="Avatar Preview"
            className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-blue-500"
            onError={(e) => {
              // Fallback, falls die URL fehlschlägt
              e.target.onerror = null;
              e.target.src = "https://placehold.co/100x100/3B82F6/ffffff?text=U";
            }}
          />
        </div>
        {message && <div className={`p-3 rounded-lg text-white ${message.startsWith("Profile") ? "bg-green-500" : "bg-red-500"}`}>{message}</div>}
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <InputText name="username" value={form.username} onChange={handleChange} className="w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <InputText name="email" type="email" value={form.email} onChange={handleChange} className="w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <Password
            name="password"
            value={form.password}
            onChange={handleChange}
            feedback={true}
            toggleMask
            className="w-full"
            placeholder="Lassen Sie das Feld leer, um das Passwort nicht zu ändern."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Profilbild hochladen</label>
          <ImageUploader maxFiles={1} onUploaded={handleImageUpload} />
        </div>

        <Button type="submit" label={loading ? "Speichert..." : "Änderungen speichern"} className="w-full p-button-success" disabled={loading} />
      </form>
    </>
  );
}
