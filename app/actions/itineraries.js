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

// Update
export async function updateItinerary({ id, userId, title, destination, start_date, short_desc, detail_desc }) {
  const stmt = db.prepare(`
    UPDATE itineraries
    SET title = ?, destination = ?, start_date = ?, short_desc = ?, detail_desc = ?
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(title, destination, start_date, short_desc, detail_desc, id, userId);
  return db.prepare("SELECT * FROM itineraries WHERE id = ?").get(id);
}

// Delete
export async function deleteItinerary({ id, userId }) {
  db.prepare("DELETE FROM itineraries WHERE id = ? AND user_id = ?").run(id, userId);
}
