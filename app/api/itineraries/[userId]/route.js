import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { userId } = await params;

  try {
    const itineraries = db.prepare("SELECT * FROM itineraries WHERE user_id = ? ORDER BY id DESC").all(userId);

    return NextResponse.json(itineraries);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
