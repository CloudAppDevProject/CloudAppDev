import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/lib/mongodb";

export async function POST(req) {
  try {
    // Eingangsdaten aus dem Request-Body lesen
    const { userId, title, destination, start_date, short_desc, detail_desc, locations } = await req.json();

    // Itinerary + locations erstellen
    const newItinerary = await prisma.itinerary.create({
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
  const search = searchParams.get("search");

  //console.log("[GET] Query parameters:", { id, userId, currentUserId, search });

  try {
    // Verbindung zu MongoDB herstellen
    const { db } = await connectToMongoDB();
    //console.log("[GET] MongoDB connected:", !!db);

    const likesCollection = db.collection("likes");
    //console.log("[GET] Using collection:", likesCollection.collectionName);

    // Einzelnes Itinerary anhand der ID abrufen
    if (id) {
      //console.log("[GET] Fetching single itinerary with ID:", id);
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: Number(id) },
        include: { locations: true },
      });

      if (!itinerary) {
        //console.warn("[GET] Itinerary not found:", id);
        return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
      }

      // Likes zählen
      const likeCount = await likesCollection.countDocuments({ itinerary_id: itinerary.id });

      // Prüfen, ob aktueller User geliked hat
      const userHasLiked = currentUserId
        ? !!(await likesCollection.findOne({
            user_id: parseInt(currentUserId),
            itinerary_id: itinerary.id,
          }))
        : false;

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

    // Prisma-Abfrage ausführen
    //console.log("[GET] Executing Prisma query with where:", where);
    const itineraries = await prisma.itinerary.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { id: "desc" },
    });

    //console.log("[GET] Found itineraries:", itineraries.length);

    // Mit Like-Daten aus MongoDB anreichern
    const enrichedItineraries = await Promise.all(
      itineraries.map(async (itinerary) => {
        const likeCount = await likesCollection.countDocuments({
          itinerary_id: itinerary.id,
        });

        const userHasLiked = currentUserId
          ? !!(await likesCollection.findOne({
              user_id: parseInt(currentUserId),
              itinerary_id: itinerary.id,
            }))
          : false;

        //console.log("[GET] Enriched itinerary:", {
        //   id: itinerary.id,
        //   likeCount,
        //   userHasLiked,
        // });

        return {
          ...itinerary,
          likeCount,
          userHasLiked,
        };
      })
    );

    //console.log("[GET] Returning enriched itineraries:", enrichedItineraries.length);
    return NextResponse.json(enrichedItineraries);
  } catch (err) {
    //console.error("[GET] Error fetching itineraries:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
