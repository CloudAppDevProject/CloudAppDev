import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/lib/mongodb";

/**
 * POST /api/likes
 * Toggle like for an itinerary
 * Body: { userId: number, itineraryId: number }
 */
export async function POST(request) {
  try {
    const { userId, itineraryId } = await request.json();

    if (!userId || !itineraryId) {
      return NextResponse.json(
        { error: "userId and itineraryId are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToMongoDB();
    const likesCollection = db.collection("likes");

    // Check if like already exists
    const existingLike = await likesCollection.findOne({
      user_id: userId,
      itinerary_id: itineraryId,
    });

    if (existingLike) {
      // Unlike: Remove the like
      await likesCollection.deleteOne({
        user_id: userId,
        itinerary_id: itineraryId,
      });

      return NextResponse.json({
        success: true,
        action: "unliked",
        message: "Like removed successfully",
      });
    } else {
      // Like: Add new like
      await likesCollection.insertOne({
        user_id: userId,
        itinerary_id: itineraryId,
        created_at: new Date(),
      });

      return NextResponse.json({
        success: true,
        action: "liked",
        message: "Like added successfully",
      });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "Failed to toggle like", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/likes?itineraryId=123
 * Get like count and user's like status for an itinerary
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itineraryId = parseInt(searchParams.get("itineraryId"));
    const userId = parseInt(searchParams.get("userId"));

    if (!itineraryId) {
      return NextResponse.json(
        { error: "itineraryId is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToMongoDB();
    const likesCollection = db.collection("likes");

    // Get total like count
    const likeCount = await likesCollection.countDocuments({
      itinerary_id: itineraryId,
    });

    // Check if current user has liked
    let userHasLiked = false;
    if (userId) {
      const userLike = await likesCollection.findOne({
        user_id: userId,
        itinerary_id: itineraryId,
      });
      userHasLiked = !!userLike;
    }

    return NextResponse.json({
      itineraryId,
      likeCount,
      userHasLiked,
    });
  } catch (error) {
    console.error("Error fetching likes:", error);
    return NextResponse.json(
      { error: "Failed to fetch likes", details: error.message },
      { status: 500 }
    );
  }
}
