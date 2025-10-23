import { prisma } from "@lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "desc" },
    });
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

      const newUser = await prisma.user.create({
        data: { name, email, password },
      });

      return NextResponse.json(newUser, { status: 201 });
    }

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });
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

export async function PUT(req) {
  try {
    const body = await req.json();
    const { userId, username, email, password, avatarUrl } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const updateData = {};
    if (username) updateData.name = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
