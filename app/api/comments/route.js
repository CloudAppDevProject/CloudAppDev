import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST - Neuen Kommentar erstellen
export async function POST(req) {
  try {
    const { userId, itineraryId, content } = await req.json();

    if (!userId || !itineraryId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId, itineraryId, content" },
        { status: 400 }
      );
    }

    const newComment = await prisma.comment.create({
      data: {
        user_id: userId,
        itinerary_id: itineraryId,
        content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (err) {
    console.error("Error creating comment:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET - Kommentare abrufen (für ein bestimmtes Itinerary)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const itineraryId = searchParams.get("itineraryId");
  const commentId = searchParams.get("id");

  try {
    if (commentId) {
      // Einzelnen Kommentar abrufen
      const comment = await prisma.comment.findUnique({
        where: { id: Number(commentId) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!comment) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }

      return NextResponse.json(comment);
    }

    if (itineraryId) {
      // Alle Kommentare für ein Itinerary abrufen
      const comments = await prisma.comment.findMany({
        where: { itinerary_id: Number(itineraryId) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          created_at: "desc"
        }
      });

      return NextResponse.json(comments);
    }

    return NextResponse.json({ error: "Missing itineraryId parameter" }, { status: 400 });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Kommentar löschen
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!commentId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: id, userId" },
        { status: 400 }
      );
    }

    // Prüfen, ob der Kommentar dem User gehört
    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) }
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== Number(userId)) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own comments" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id: Number(commentId) }
    });

    return NextResponse.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
