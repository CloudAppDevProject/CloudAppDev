"use client";
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext({
  user: null,
  setUser: () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const { user, setUser } = useContext(UserContext);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // 💡 Hilfsvariable für den aktuellen DB-Pfad
  const dbAvatarPath = user?.avatarUrl;

  useEffect(() => {
    if (user) {
      console.log("User object in useUser:", user);
      console.log("DB avatarUrl (GCS URI):", dbAvatarPath);
    }

    // 💡 KORREKTUR DER LOGIK:
    // Lade die URL NEU, wenn:
    // 1. Ein Benutzer eingeloggt ist UND
    // 2. Ein Pfad vorhanden ist UND
    // 3. Entweder noch KEINE signierte URL existiert ODER der Pfad sich geändert hat.
    if (user && dbAvatarPath) {
      // 1. Pfad extrahieren: "gs://pictures-clouddev/user_1/..." -> "user_1/..."
      const pathParts = dbAvatarPath.split("/");

      if (pathParts.length < 4) {
        console.error("Invalid GCS URI format:", dbAvatarPath);
        setAvatarUrl("/default-avatar.png");
        return;
      }

      // Der Pfad, den die API Route erwartet (z.B. user_1/2025-10-23/...)
      const gcsFilePath = pathParts.slice(3).join("/");

      // Generiere einen temporären Cache-Schlüssel, um zu prüfen, ob der Pfad neu ist
      // (Das ist nicht perfekt, aber stellt sicher, dass fetchSignedUrl nur bei Bedarf aufgerufen wird)
      if (avatarUrl && avatarUrl.includes(gcsFilePath)) {
        // Die aktuelle signierte URL scheint bereits für diesen Pfad gültig zu sein.
        return;
      }

      console.log("Extracted GCS File Path for API:", gcsFilePath);

      // Funktion zum Abrufen der signierten URL
      const fetchSignedUrl = async () => {
        try {
          // API-Aufruf mit dem korrigierten, extrahierten Pfad
          const response = await fetch(`/api/avatar?path=${encodeURIComponent(gcsFilePath)}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to fetch signed URL. API returned:", errorText);
            throw new Error("Failed to fetch signed URL");
          }

          const data = await response.json();
          setAvatarUrl(data.url); // Speichere die temporäre, signierte URL
        } catch (error) {
          console.error("Error fetching avatar URL:", error);
          setAvatarUrl("/default-avatar.png"); // Fallback
        }
      };

      fetchSignedUrl();
    } else if (!user) {
      // Setze avatarUrl zurück, wenn der Benutzer abgemeldet ist
      setAvatarUrl(null);
    } else if (user && !dbAvatarPath) {
      // Wenn der Benutzer existiert, aber keinen Avatar-Pfad hat (z.B. nach Löschung)
      setAvatarUrl("/default-avatar.png");
    }
  }, [user, dbAvatarPath]); // 💡 dbAvatarPath zu Dependencies hinzugefügt

  // Gib die abgerufene URL zusammen mit den ursprünglichen Werten zurück
  return { user, setUser, avatarUrl };
}
