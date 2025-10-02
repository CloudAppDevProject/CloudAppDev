import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { userId, title, destination, start_date, short_desc, detail_desc } =
      await req.json();

    const stmt = db.prepare(`
      INSERT INTO itineraries (user_id, title, destination, start_date, short_desc, detail_desc)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      userId,
      title,
      destination,
      start_date,
      short_desc,
      detail_desc
    );

    const newItinerary = db
      .prepare("SELECT * FROM itineraries WHERE id = ?")
      .get(info.lastInsertRowid);

    return NextResponse.json(newItinerary, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
