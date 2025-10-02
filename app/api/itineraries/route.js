import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { userId, title, destination, start_date, short_desc, detail_desc } = await req.json();

    const stmt = db.prepare(`
      INSERT INTO itineraries (user_id, title, destination, start_date, short_desc, detail_desc)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(userId, title, destination, start_date, short_desc, detail_desc);

    const newItinerary = db.prepare("SELECT * FROM itineraries WHERE id = ?").get(info.lastInsertRowid);

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
      const itinerary = db.prepare("SELECT * FROM itineraries WHERE id = ?").get(id);
      if (!itinerary) {
        return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
      }
      return NextResponse.json(itinerary);
    }

    if (userId) {
      // Alle Itineraries eines Users
      const itineraries = db.prepare("SELECT * FROM itineraries WHERE user_id = ? ORDER BY id DESC").all(userId);
      return NextResponse.json(itineraries);
    }

    // Weder id noch userId angegeben
    return NextResponse.json({ error: "Please provide either id or userId" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
