import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/lib/mongodb";

export async function POST(req) {
  try {
    // Eingangsdaten aus dem Request-Body lesen
    const { userId, title, destination, start_date, short_desc, detail_desc, locations } = await req.json();

    // Itinerary + locations erstellen mit Timeout
    // Use Promise.race to timeout after 15 seconds
    const createPromise = prisma.itinerary.create({
      data: {
        user_id: userId,
        title,
        destination,
        start_date,
        short_desc,
        detail_desc,
        locations: locations && Array.isArray(locations)
          ? {
              create: locations.map(loc => ({
                name: loc.name,
                start_date: loc.start_date,
                end_date: loc.end_date,
                short_desc: loc.short_desc,
                images: loc.images || [],
              }))
            }
          : undefined,
      },
      include: { locations: true },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timeout after 15s')), 15000)
    );

    const newItinerary = await Promise.race([createPromise, timeoutPromise]);

    //console.log("[POST] Itinerary created:", newItinerary.id);

    return NextResponse.json(newItinerary, { status: 201 });
  } catch (err) {
    
    // Return 503 for timeouts (Service Temporarily Unavailable)
    if (err.message.includes('timeout')) {
      return NextResponse.json({ error: 'Service temporarily unavailable, please try again' }, { status: 503 });
    }
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");
  const currentUserId = searchParams.get("currentUserId");
  const search = searchParams.get("search");
  const includeLikes = searchParams.get("includeLikes") === "true";
  
  // Pagination parameters
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  //console.log("[GET] Query parameters:", { id, userId, currentUserId, search, page, limit, includeLikes });

  try {
    // Einzelnes Itinerary anhand der ID abrufen
    if (id) {
      //console.log("[GET] Fetching single itinerary with ID:", id);
      
      // OPTIMIZATION: Fetch itinerary and MongoDB connection in PARALLEL
      const [itinerary, mongoConnection] = await Promise.all([
        prisma.itinerary.findUnique({
          where: { id: Number(id) },
          include: { locations: true },
      }),
        connectToMongoDB(),
      ]);

      if (!itinerary) {
        //console.warn("[GET] Itinerary not found:", id);
        return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
      }

      // Für einzelnes Itinerary immer Likes laden
      const { db } = mongoConnection;
      const likesCollection = db.collection("likes");
      
      // OPTIMIZATION: Fetch likeCount and userHasLiked in PARALLEL
      const [likeCount, userLike] = await Promise.all([
        likesCollection.countDocuments({ itinerary_id: itinerary.id }),
        currentUserId
          ? likesCollection.findOne({
              user_id: parseInt(currentUserId),
              itinerary_id: itinerary.id,
            })
          : Promise.resolve(null),
      ]);
      
      const userHasLiked = !!userLike;

      //console.log("[GET] Like count:", likeCount, "User has liked:", userHasLiked);

      return NextResponse.json({
        ...itinerary,
        likeCount,
        userHasLiked,
      });
    }

    // Dynamische Filterbedingungen aufbauen
    const where = {};
    if (userId) {
      where.user_id = Number(userId);
      //console.log("[GET] Filtering by userId:", where.user_id);
    }

    if (search) {
      //console.log("[GET] Applying search filter:", search);
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { short_desc: { contains: search, mode: "insensitive" } },
        { detail_desc: { contains: search, mode: "insensitive" } },
      ];
    }

    // Prisma-Abfrage mit Pagination ausführen
    //console.log("[GET] Executing Prisma query with where:", where);
    
    // OPTIMIZATION: Run PostgreSQL and MongoDB queries in PARALLEL
    const [itineraries, totalCount, mongoConnection] = await Promise.all([
      prisma.itinerary.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      prisma.itinerary.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
      // Pre-connect to MongoDB if likes are needed (runs in parallel!)
      includeLikes ? connectToMongoDB() : Promise.resolve(null),
    ]);

    //console.log("[GET] Found itineraries:", itineraries.length, "Total:", totalCount);

    // Optional: Likes-Daten aus MongoDB anreichern (nur wenn angefordert)
    let enrichedItineraries = itineraries;
    
    if (includeLikes && mongoConnection) {
      const { db } = mongoConnection;
      const likesCollection = db.collection("likes");
      
      // Alle Itinerary-IDs sammeln
      const itineraryIds = itineraries.map(i => i.id);
      
      // Batch-Abfrage für alle Likes (viel effizienter als N einzelne Queries)
      const allLikes = await likesCollection
        .find({ itinerary_id: { $in: itineraryIds } })
        .toArray();
      
      // Likes pro Itinerary gruppieren
      const likesMap = {};
      const userLikesSet = new Set();
      
      allLikes.forEach(like => {
        if (!likesMap[like.itinerary_id]) {
          likesMap[like.itinerary_id] = 0;
        }
        likesMap[like.itinerary_id]++;
        
        if (currentUserId && like.user_id === parseInt(currentUserId)) {
          userLikesSet.add(like.itinerary_id);
        }
      });
      
      // Itineraries mit Like-Daten anreichern
      enrichedItineraries = itineraries.map(itinerary => ({
        ...itinerary,
        likeCount: likesMap[itinerary.id] || 0,
        userHasLiked: userLikesSet.has(itinerary.id),
      }));
      
      //console.log("[GET] Enriched with likes using batch query (parallel fetch)");
    }

    // Pagination-Metadaten
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    //console.log("[GET] Returning itineraries with pagination:", {
    //   count: enrichedItineraries.length,
    //   page,
    //   totalPages,
    //   totalCount,
    // });

    return NextResponse.json({
      data: enrichedItineraries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (err) {
    //console.error("[GET] Error fetching itineraries:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
