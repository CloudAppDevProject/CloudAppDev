"use client";

import { useState } from "react";
import { Button } from "primereact/button";

export default function LikeButton({ itineraryId, userId, initialLiked, initialCount, onLikeChange }) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleLikeToggle = async (e) => {
    e.stopPropagation(); // Prevent row click event

    if (!userId) {
      console.error("User must be logged in to like");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          itineraryId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      const data = await response.json();

      // Update local state
      const newLiked = data.action === "liked";
      setLiked(newLiked);
      setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));

      // Notify parent component if callback provided
      if (onLikeChange) {
        onLikeChange(itineraryId, newLiked);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        icon={liked ? "pi pi-heart-fill" : "pi pi-heart"}
        className={liked ? "p-button-danger" : "p-button-secondary"}
        onClick={handleLikeToggle}
        loading={loading}
        disabled={loading}
        tooltip={liked ? "Unlike" : "Like"}
        tooltipOptions={{ position: "top" }}
        size="small"
      />
      <span className="text-sm font-medium text-gray-600">
        {likeCount} {likeCount === 1 ? "Like" : "Likes"}
      </span>
    </div>
  );
}
