import db from "@lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const users = db.prepare("SELECT * FROM users ORDER BY id DESC").all();
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    const body = await req.json();

    if (action === "register") {
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return NextResponse.json({ error: "Name, Email and Password are required" }, { status: 400 });
      }

      const stmt = db.prepare(`
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
      `);
      const info = stmt.run(name, email, password);
      const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);

      return NextResponse.json(newUser, { status: 201 });
    }

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(user);
    }

    return NextResponse.json({ error: "Unknown action. Use ?action=register or ?action=login" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
