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
 * 
 * GET /api/likes?itineraryIds=1,2,3&userId=5 (Batch query for multiple itineraries)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itineraryId = searchParams.get("itineraryId");
    const itineraryIds = searchParams.get("itineraryIds");
    const userId = parseInt(searchParams.get("userId"));

    const { db } = await connectToMongoDB();
    const likesCollection = db.collection("likes");

    // Batch query for multiple itineraries
    if (itineraryIds) {
      const ids = itineraryIds.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (ids.length === 0) {
        return NextResponse.json(
          { error: "Valid itineraryIds are required" },
          { status: 400 }
        );
      }

      // Fetch all likes for the given itineraries in one query
      const allLikes = await likesCollection
        .find({ itinerary_id: { $in: ids } })
        .toArray();

      // Group likes by itinerary
      const likesMap = {};
      const userLikesSet = new Set();

      allLikes.forEach(like => {
        if (!likesMap[like.itinerary_id]) {
          likesMap[like.itinerary_id] = 0;
        }
        likesMap[like.itinerary_id]++;

        if (userId && like.user_id === userId) {
          userLikesSet.add(like.itinerary_id);
        }
      });

      // Build response for each itinerary
      const result = ids.map(id => ({
        itineraryId: id,
        likeCount: likesMap[id] || 0,
        userHasLiked: userLikesSet.has(id),
      }));

      return NextResponse.json(result);
    }

    // Single itinerary query
    if (!itineraryId) {
      return NextResponse.json(
        { error: "itineraryId or itineraryIds is required" },
        { status: 400 }
      );
    }

    const parsedItineraryId = parseInt(itineraryId);

    // Get total like count
    const likeCount = await likesCollection.countDocuments({
      itinerary_id: parsedItineraryId,
    });

    // Check if current user has liked
    let userHasLiked = false;
    if (userId) {
      const userLike = await likesCollection.findOne({
        user_id: userId,
        itinerary_id: parsedItineraryId,
      });
      userHasLiked = !!userLike;
    }

    return NextResponse.json({
      itineraryId: parsedItineraryId,
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
