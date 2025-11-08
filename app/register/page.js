"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Password } from "primereact/password";
import { InputText } from "primereact/inputtext";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebaseClient"; // Dein Firebase Client Setup

// Force dynamic rendering - don't prerender this page at build time
export const dynamic = 'force-dynamic';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    // Check if Firebase is initialized
    if (!auth) {
      setError("Firebase authentication is not available. Please check your configuration.");
      console.error("[Register] Firebase auth is null");
    } else {
      setIsFirebaseReady(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validate Firebase is ready
    if (!auth) {
      setError("Authentication service is not available. Please try again later.");
      return;
    }

    try {
      // 1️⃣ User in Firebase Auth erstellen
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // 2️⃣ Optional: Display Name setzen
      if (form.name) {
        await updateProfile(userCredential.user, { displayName: form.name });
      }

      // 3️⃣ ID-Token vom Client holen
      const idToken = await userCredential.user.getIdToken(true);
      console.log("ID Token:", idToken);

      // 4️⃣ Token ans Backend senden, damit User in Prisma angelegt wird
      const res = await fetch("/api/user?action=register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`, // 🔑 wichtig
        },
        body: JSON.stringify({ displayName: form.name }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Registration failed");
      }

      const newUser = await res.json();

      // 5️⃣ Optional: User in Context speichern, falls du globalen User-Context hast
      // setUser({ ...newUser, token: idToken });

      // 6️⃣ Form zurücksetzen und zu Login navigieren
      setForm({ name: "", email: "", password: "" });
      router.push("/login");
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Register Traveller</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <InputText
            name="username"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mb-6"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-Mail</label>
          <InputText
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <Password
            name="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            feedback={true}
            toggleMask
            className="w-full"
            required
          />
        </div>

        <button 
          type="submit" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!isFirebaseReady}
        >
          {isFirebaseReady ? 'Register' : 'Loading...'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {!isFirebaseReady && !error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">⏳ Initializing authentication service...</span>
        </div>
      )}
    </div>
  );
}
