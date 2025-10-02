"use server";
import db from "@lib/db";

export async function registerUser({ name, email, password }) {
  if (!name || !email || !password) throw new Error("Name, Email and Password are required");
  const stmt = db.prepare(`
    INSERT INTO users (name, email, password)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(name, email, password);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
}

export async function loginUser({ email, password }) {
  if (!email || !password) throw new Error("Email and password are required");

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
