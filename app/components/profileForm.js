"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import ImageUploader from "./imageUpload";

// --- HILFSFUNKTIONEN FÜR SIGNED URLS (übernommen aus NewItinerary) ---

/** Helper: check URL type */
const isHttp = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const isGs = (u) => typeof u === "string" && /^gs:\/\//i.test(u);

/** Get signed URL from User Service through Next.js proxy */
const getSignedUrl = async (url) => {
  try {
    const resp = await fetch(`/api/signed-url?path=${encodeURIComponent(url)}&service=user`);
    if (!resp.ok) throw new Error("signing failed");
    const data = await resp.json();
    const signed = data?.url;
    return isHttp(signed) ? signed : null;
  } catch (e) {
    console.error("Signing failed for", url, e);
    return null;
  }
};

/** Sign one uploaded image and return shape { url, signed_url } (oder nur string) */
const signOne = async (url) => {
  if (!url) return null;
  if (isHttp(url)) {
    return { url, signed_url: url }; // already public
  }
  if (isGs(url)) {
    const signed = await getSignedUrl(url);
    if (signed) return { url, signed_url: signed };
    // Fallback: Wenn Signierung fehlschlägt, geben wir den Original-gs:// Pfad zurück,
    // damit er im State bleibt, aber das Preview-Bild wird leer sein.
    return { url };
  }
  return { url };
};
// ----------------------------------------------------------------------

export default function ProfileForm({ user, onUpdate }) {
  const router = useRouter();

  // Initialer Wert: Wenn der Benutzer eine URL hat, signieren wir sie sofort,
  // um das korrekte Vorschau-Bild zu erhalten.
  // Wir verwenden hier einen zusätzlichen State für die signierte URL.
  const initialAvatar = user.avatarUrl || "";
  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    password: "",
    avatarUrl: initialAvatar, // Der Rohpfad (gs:// oder https://)
  });

  const [signedAvatar, setSignedAvatar] = useState(initialAvatar); // Die URL für die Anzeige (https://)
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Effekt, um die initiale Avatar-URL (falls vorhanden) zu signieren
  // Dies stellt sicher, dass das existierende Profilbild angezeigt wird,
  // falls es ein privater gs:// Pfad ist.
  // Führen Sie diesen einmalig beim Laden der Komponente aus.
  useState(() => {
    const loadInitialAvatar = async () => {
      if (initialAvatar) {
        const signed = await signOne(initialAvatar);
        setSignedAvatar(signed?.signed_url || initialAvatar);
      }
    };
    loadInitialAvatar();
  }, [initialAvatar]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      // Wenn der Uploader "leert", setzen wir alles zurück
      setForm((prev) => ({ ...prev, avatarUrl: "" }));
      setSignedAvatar("");
      return;
    }

    // 1. URL extrahieren (kann String oder Objekt sein, wie im NewItinerary-Code)
    const rawUrl = (uploadedFiles[0]?.url || uploadedFiles[0]?.path || uploadedFiles[0]?.gsUrl || uploadedFiles[0]?.storagePath || uploadedFiles[0]).toString().trim();
    if (!rawUrl) return;

    // 2. URL signieren
    const signedImageObject = await signOne(rawUrl);

    // 3. States aktualisieren
    // Speichern des Rohpfads (url) für das Backend
    setForm((prev) => ({ ...prev, avatarUrl: signedImageObject.url }));
    // Speichern der signierten URL (signed_url) für die Vorschau
    setSignedAvatar(signedImageObject.signed_url || signedImageObject.url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Bereinigen Sie die URL für das Backend: Wir senden nur den Rohpfad (gs:// oder https://)
    const avatarToSave = isHttp(form.avatarUrl) ? form.avatarUrl : form.avatarUrl;

    try {
      const payload = {
        userId: user.id,
        username: form.username,
        email: form.email,
        // Wichtig: Wir senden den Rohpfad, keine signed URL.
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
      // Clear JWT token from localStorage
      localStorage.removeItem('access_token');
      // Clear any session data
      await fetch('/api/user?action=logout', { method: 'POST' });
      router.push("/login");
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

      {/* Newsletter Preferences Link */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Newsletter Preferences</h3>
            <p className="text-sm text-blue-700 mt-1">Manage your email subscription frequency and preferences</p>
          </div>
          <Link href={`/newsletter/preferences/${user.id}`}>
            <Button
              type="button"
              label="Manage Preferences"
              icon="pi pi-envelope"
              className="p-button-outlined p-button-info"
            />
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <img
            // Verwenden Sie die 'signedAvatar' für die Anzeige
            src={signedAvatar || "/default-avatar.png"}
            alt="Avatar Preview"
            className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-blue-500"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/default-avatar.png";
            }}
          />
        </div>

        {/* ... (Weitere Formularfelder) ... */}
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
          {/* Hinzufügen des initialen Werts, damit der Uploader das aktuelle Bild anzeigt */}
          <ImageUploader
            maxFiles={1}
            onUploaded={handleImageUpload}
            // Optional: zeigt dem Uploader, welche Datei(en) bereits vorhanden sind
            initialFiles={form.avatarUrl ? [form.avatarUrl] : []}
          />
        </div>

        <Button type="submit" label={loading ? "Speichert..." : "Änderungen speichern"} className="w-full p-button-success" disabled={loading} />
      </form>
    </>
  );
}
