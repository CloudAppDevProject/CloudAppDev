import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
  const search = searchParams.get("search"); // 🔍 Neuer Parameter

  try {
    if (id) {
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: Number(id) },
      });
      if (!itinerary) {
        return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
      }
      return NextResponse.json(itinerary);
    }


    if (userId) {
      // Alle Itineraries eines Users
      var userWithItineraries = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { itineraries: true },
      });
      userWithItineraries = userWithItineraries ? userWithItineraries.itineraries : [];
    } else {
      // Alle Itineraries
      userWithItineraries = await prisma.itinerary.findMany();
    }

    if (search) {
      const filtered = await prisma.itinerary.findMany({
        where: {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { destination: { contains: search, mode: "insensitive" } },
            { start_date: { contains: search, mode: "insensitive" } }, // falls startDate ein String ist
          ],
        },
      });
      return NextResponse.json(filtered);
    }

    // Alle Itineraries
    return NextResponse.json(userWithItineraries);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
