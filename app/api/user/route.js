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
