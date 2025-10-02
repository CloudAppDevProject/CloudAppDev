"use server";
import db from "@/lib/db";

// Hol alle Itineraries für einen User
export async function getItineraries(userId) {
  return db.prepare("SELECT * FROM itineraries WHERE user_id = ? ORDER BY id DESC").all(userId);
}

// Neues Itinerary anlegen
export async function addItinerary({ userId, title, destination, start_date, short_desc, detail_desc }) {
  const stmt = db.prepare(`
    INSERT INTO itineraries (user_id, title, destination, start_date, short_desc, detail_desc)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(userId, title, destination, start_date, short_desc, detail_desc);
  return db.prepare("SELECT * FROM itineraries WHERE id = ?").get(info.lastInsertRowid);
}
