import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/lib/mongodb";
import { prisma } from "@/lib/prisma";

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

    // Fetch user data from PostgreSQL (users are still in SQL)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Store comment in MongoDB
    const { db } = await connectToMongoDB();
    const commentsCollection = db.collection("comments");

    const newComment = {
      user_id: userId,
      itinerary_id: itineraryId,
      content,
      created_at: new Date(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };

    const result = await commentsCollection.insertOne(newComment);
    
    // Return comment with MongoDB _id converted to id for frontend compatibility
    const createdComment = {
      id: result.insertedId.toString(),
      user_id: newComment.user_id,
      itinerary_id: newComment.itinerary_id,
      content: newComment.content,
      created_at: newComment.created_at,
      user: newComment.user
    };

    return NextResponse.json(createdComment, { status: 201 });
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
    const { db } = await connectToMongoDB();
    const commentsCollection = db.collection("comments");

    if (commentId) {
      // Einzelnen Kommentar abrufen
      const { ObjectId } = await import("mongodb");
      
      let comment;
      // Try to find by MongoDB _id first
      if (ObjectId.isValid(commentId)) {
        comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });
      }
      
      // If not found and commentId is numeric, try sql_id (for backward compatibility)
      if (!comment && !isNaN(commentId)) {
        comment = await commentsCollection.findOne({ sql_id: Number(commentId) });
      }

      if (!comment) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }

      // Transform MongoDB document to match frontend expectations
      const formattedComment = {
        id: comment._id.toString(),
        user_id: comment.user_id,
        itinerary_id: comment.itinerary_id,
        content: comment.content,
        created_at: comment.created_at,
        user: comment.user
      };

      return NextResponse.json(formattedComment);
    }

    if (itineraryId) {
      // Alle Kommentare für ein Itinerary abrufen
      const comments = await commentsCollection
        .find({ itinerary_id: Number(itineraryId) })
        .sort({ created_at: -1 })
        .toArray();

      // Transform MongoDB documents to match frontend expectations
      const formattedComments = comments.map(comment => ({
        id: comment._id.toString(),
        user_id: comment.user_id,
        itinerary_id: comment.itinerary_id,
        content: comment.content,
        created_at: comment.created_at,
        user: comment.user
      }));

      return NextResponse.json(formattedComments);
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

    const { db } = await connectToMongoDB();
    const commentsCollection = db.collection("comments");
    const { ObjectId } = await import("mongodb");

    // Find comment by MongoDB _id
    let comment;
    if (ObjectId.isValid(commentId)) {
      comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });
    }
    
    // If not found and commentId is numeric, try sql_id (for backward compatibility)
    if (!comment && !isNaN(commentId)) {
      comment = await commentsCollection.findOne({ sql_id: Number(commentId) });
    }

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Prüfen, ob der Kommentar dem User gehört
    if (comment.user_id !== Number(userId)) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Delete comment
    await commentsCollection.deleteOne({ _id: comment._id });

    return NextResponse.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
