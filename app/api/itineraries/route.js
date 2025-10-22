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

  try {
    if (id) {
      // Einzelnes Itinerary anhand der ID
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: Number(id) }
      });
      if (!itinerary) {
        return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
      }
      return NextResponse.json(itinerary);
    }

    if (userId) {
      // Alle Itineraries eines Users
      const itineraries = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { itineraries: true }
      });
      return NextResponse.json(itineraries ? itineraries.itineraries : []);
    }

    // Alle Itineraries
    const allItineraries = await prisma.itinerary.findMany();
    return NextResponse.json(allItineraries);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
