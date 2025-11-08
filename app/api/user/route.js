import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { prisma } from '@/lib/prisma'; // ggf. anpassen
import { verifyIdToken } from '@/lib/firebaseAdmin'; // ggf. anpassen

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
const alg = 'HS256';

async function signSession(payload) {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

async function verifySession(token) {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // in dev false, damit Cookie lokal klappt
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

function clearSessionCookie(res) {
  res.cookies.set('session', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });
}

// USER LADEN
export async function GET() {
  const token = (await cookies()).get('session')?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const payload = await verifySession(token);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl || null,
    },
  });
}

// LOGIN / REGISTER (Firebase oder Fallback)
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const authHeader = req.headers.get('authorization');
    const firebaseIdToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    const body = await req.json().catch(() => ({}));

    // FALLBACK ohne Firebase
    if (!firebaseIdToken) {
      if (action === 'register') {
        const { name, email, password } = body;
        if (!name || !email || !password) {
          return NextResponse.json({ error: 'Name, Email and Password are required' }, { status: 400 });
        }
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }
        // WARN: Passwort noch nicht gehasht
        const newUser = await prisma.user.create({
          data: { name, email, password },
        });

        const jwt = await signSession({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          avatarUrl: newUser.avatarUrl || null,
        });

        const res = NextResponse.json({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          avatarUrl: newUser.avatarUrl || null,
        }, { status: 201 });
        setSessionCookie(res, jwt);
        return res;
      }

      if (action === 'login') {
        const { email, password } = body;
        if (!email || !password) {
          return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        // TODO: Passwort-Hash prüfen

        const jwt = await signSession({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl || null,
        });

        const res = NextResponse.json({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl || null,
        }, { status: 200 });
        setSessionCookie(res, jwt);
        return res;
      }

      return NextResponse.json({ error: 'Unknown action or missing authentication' }, { status: 400 });
    }

    // FIREBASE PATH
    const decoded = await verifyIdToken(firebaseIdToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { email, name, uid, picture } = decoded;

    if (!email) {
      return NextResponse.json({ error: 'Firebase token missing email' }, { status: 400 });
    }

    if (action === 'login') {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: name || 'Unnamed Traveller',
            googleUid: uid,
            avatarUrl: picture || null,
          },
        });
      }

      const jwt = await signSession({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
      });

      const res = NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
      }, { status: 200 });
      setSessionCookie(res, jwt);
      return res;
    }

    if (action === 'register') {
      const { displayName, avatarUrl } = body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      const newUser = await prisma.user.create({
        data: {
          name: displayName || name || 'New Traveller',
            email,
            googleUid: uid,
            avatarUrl: avatarUrl || picture || null,
        },
      });

      const jwt = await signSession({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl || null,
      });

      const res = NextResponse.json({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl || null,
      }, { status: 201 });
      setSessionCookie(res, jwt);
      return res;
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/user error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// LOGOUT
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
