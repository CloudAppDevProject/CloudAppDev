import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * Simple proxy to User Service for current user data
 * Frontend sends JWT token via Authorization header from localStorage
 */
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Forward request to User Service through API Gateway
    const res = await fetch(`${API_GATEWAY_URL}/api/v1/users/auth/me`, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const userData = await res.json();
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('[API /user GET] Error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

/**
 * Handle logout - just clear client-side token
 * Actual logout is handled by removing JWT from localStorage on client
 */
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'logout') {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/**
 * Update user profile - forwards to User Service
 * Frontend sends PUT to update user data (name, email, etc.)
 * Extracts user ID from JWT token, so frontend doesn't need to send it
 */
export async function PUT(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();

    if (!authHeader) {
      console.error('[API /user PUT] Missing authorization header');
      return NextResponse.json({ error: 'Unauthorized', message: 'Missing authorization header' }, { status: 401 });
    }

    // Extract user ID from JWT token
    // JWT format: "Bearer <token>"
    // Token payload: { sub: userId, email, name, ... }
    let userId;
    try {
      const token = authHeader.replace('Bearer ', '');
      // Parse JWT payload (without verification - done by backend)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      userId = decoded.sub;

      if (!userId) {
        throw new Error('No user ID in token');
      }
    } catch (tokenError) {
      console.error('[API /user PUT] Token parsing error:', tokenError.message);
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    console.log(`[API /user PUT] Updating user ${userId} with auth token`);

    // Forward request to User Service through API Gateway
    // Use PATCH method as per NestJS controller requirement
    const res = await fetch(`${API_GATEWAY_URL}/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    console.log(`[API /user PUT] Gateway response status: ${res.status}`);

    if (!res.ok) {
      const errorData = await res.json();
      console.error('[API /user PUT] Gateway error:', errorData);
      return NextResponse.json(errorData, { status: res.status });
    }

    const userData = await res.json();
    return NextResponse.json(userData);
  } catch (error) {
    console.error('[API /user PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', message: error.message },
      { status: 500 }
    );
  }
}
