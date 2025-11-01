import { prisma } from "@lib/prisma";
import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebaseAdmin";

// 🔹 Alle Benutzer abrufen (Admin-only oder Testzweck)
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

// 🔹 Login & Registrierung über Google Identity Platform (mit Fallback für traditionelle Auth)
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    // Token aus Authorization-Header holen
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];

    const body = await req.json();

    // 🔄 FALLBACK: Traditionelle Authentifizierung für Load Testing & Legacy Support
    if (!token) {
      // Traditional registration (for load testing and backward compatibility)
      if (action === "register") {
        const { name, email, password } = body;
        if (!name || !email || !password) {
          return NextResponse.json({ error: "Name, Email and Password are required" }, { status: 400 });
        }

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const newUser = await prisma.user.create({
          data: { name, email, password }
        });

        return NextResponse.json(newUser, { status: 201 });
      }

      // Traditional login (for load testing and backward compatibility)
      if (action === "login") {
        const { email, password } = body;
        if (!email || !password) {
          return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Note: In production, you should verify the password hash here
        // For load testing purposes, we skip password verification
        return NextResponse.json(user);
      }

      return NextResponse.json({ error: "Unknown action or missing authentication" }, { status: 400 });
    }

    // 🔐 FIREBASE AUTHENTICATION PATH
    // 🔍 Token verifizieren
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { email, name, uid, picture } = decoded;

    // Action unterscheiden
    if (action === "login") {
      // Falls der User noch nicht existiert, automatisch anlegen
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: name || "Unnamed Traveller",
            googleUid: uid,
            avatarUrl: picture || null,
          },
        });
      }

      return NextResponse.json(user);
    }

    if (action === "register") {
      // Registrierung wird im Client über Identity Platform gemacht,
      // hier kannst du aber zusätzliche Profilinfos speichern.
      const { displayName, avatarUrl } = body;

      let existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }

      const newUser = await prisma.user.create({
        data: {
          name: displayName || name || "New Traveller",
          email,
          googleUid: uid,
          avatarUrl: avatarUrl || picture || null,
        },
      });

      return NextResponse.json(newUser, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/user error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔹 Benutzerprofil updaten
export async function PUT(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const body = await req.json();
    const { username, email, avatarUrl } = body;

    // Finde Benutzer anhand der Firebase UID
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: username || user.name,
        email: email || user.email,
        avatarUrl: avatarUrl || user.avatarUrl,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error("PUT /api/user error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
