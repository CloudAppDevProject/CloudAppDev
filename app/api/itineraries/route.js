import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/lib/mongodb";

export async function POST(req) {
  try {
    const { userId, title, destination, start_date, short_desc, detail_desc } = await req.json();

    const newItinerary = await prisma.itinerary.create({
      data: {
        user_id: userId,
        title,
        destination,
        start_date,
        short_desc,
        detail_desc
      }
    });

    return NextResponse.json(newItinerary, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");
  const currentUserId = searchParams.get("currentUserId");

  try {
    // Get MongoDB connection for likes
    const { db } = await connectToMongoDB();
    const likesCollection = db.collection("likes");

    if (id) {
      // Einzelnes Itinerary anhand der ID
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: Number(id) }
      });
      if (!itinerary) {
        return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
      }

      // Add like data
      const likeCount = await likesCollection.countDocuments({
        itinerary_id: itinerary.id,
      });

      let userHasLiked = false;
      if (currentUserId) {
        const userLike = await likesCollection.findOne({
          user_id: parseInt(currentUserId),
          itinerary_id: itinerary.id,
        });
        userHasLiked = !!userLike;
      }

      return NextResponse.json({
        ...itinerary,
        likeCount,
        userHasLiked,
      });
    }

    // Fetch itineraries
    let itineraries;
    if (userId) {
      // Alle Itineraries eines Users
      const userWithItineraries = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { itineraries: true }
      });
      itineraries = userWithItineraries ? userWithItineraries.itineraries : [];
    } else {
      // Alle Itineraries
      itineraries = await prisma.itinerary.findMany();
    }

    // Enrich with like data from MongoDB
    const enrichedItineraries = await Promise.all(
      itineraries.map(async (itinerary) => {
        const likeCount = await likesCollection.countDocuments({
          itinerary_id: itinerary.id,
        });

        let userHasLiked = false;
        if (currentUserId) {
          const userLike = await likesCollection.findOne({
            user_id: parseInt(currentUserId),
            itinerary_id: itinerary.id,
          });
          userHasLiked = !!userLike;
        }

        return {
          ...itinerary,
          likeCount,
          userHasLiked,
        };
      })
    );

    return NextResponse.json(enrichedItineraries);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
