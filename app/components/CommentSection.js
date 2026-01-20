"use client";

import { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";

export default function CommentSection({ itineraryId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Lade Kommentaranzahl beim Mount
  useEffect(() => {
    loadCommentCount();
  }, [itineraryId]);

  // Lade vollständige Kommentare beim Aufklappen
  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments, itineraryId]);

  const loadCommentCount = async () => {
    try {
      const res = await fetch(`/api/comments?itineraryId=${itineraryId}`);
      if (res.ok) {
        const data = await res.json();
        setCommentCount(data.total || 0);
      }
    } catch (err) {
      console.error("Error loading comment count:", err);
    }
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?itineraryId=${itineraryId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setCommentCount(data.total || 0);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          itineraryId: itineraryId,
          text: newComment.trim()
        })
      });

      if (res.ok) {
        const createdComment = await res.json();
        const normalizedComment = {
          ...createdComment,
          userId: createdComment.userId ?? currentUser.id,
          userName: createdComment.userName || currentUser?.name || null
        };
        setComments([normalizedComment, ...comments]);
        setCommentCount(commentCount + 1);
        setNewComment("");
      } else {
        console.error("Failed to create comment");
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`/api/comments?id=${commentId}&userId=${currentUser.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        setCommentCount(commentCount - 1);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete comment");
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Kommentare ({commentCount})</h2>
        <Button
          label={showComments ? "Kommentare ausblenden" : "Kommentare anzeigen"}
          icon={showComments ? "pi pi-chevron-up" : "pi pi-chevron-down"}
          onClick={() => setShowComments(!showComments)}
        />
      </div>

      {showComments && (
        <div>
          {/* Kommentar-Formular */}
          <Card className="mb-4">
            <form onSubmit={handleSubmitComment}>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">
                  Neuer Kommentar
                </label>
                <InputTextarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full"
                  placeholder="Schreibe einen Kommentar..."
                  disabled={submitting}
                />
              </div>
              <Button
                type="submit"
                label={submitting ? "Wird gesendet..." : "Kommentar abschicken"}
                icon="pi pi-send"
                disabled={!newComment.trim() || submitting}
              />
            </form>
          </Card>

          {/* Kommentarliste */}
          {loading ? (
            <p className="text-center py-4">Lade Kommentare...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              Noch keine Kommentare. Sei der Erste!
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id} className="bg-gray-50 dark:bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">
                          {comment.userName || `User ${comment.userId}`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comment.text}
                      </p>
                    </div>
                    {comment.userId === currentUser.id && (
                      <Button
                        icon="pi pi-trash"
                        onClick={() => handleDeleteComment(comment.id)}
                        severity="danger"
                        text
                        rounded
                        size="small"
                        className="ml-2"
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
