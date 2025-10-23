"use client";

import { useEffect, useState } from "react";
import { useUser } from "@context/UserContext";
import { useRouter } from "next/navigation";
import ProfileForm from "../components/profileForm";

export default function ProfilePage() {
  const { user, setUser } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(false);
  }, [user, router]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <ProfileForm user={user} onUpdate={setUser} />
    </div>
  );
}
