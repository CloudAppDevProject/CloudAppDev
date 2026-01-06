import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * POST /api/auth/login - Proxy to User Service authentication via API Gateway
 * Body: { email: string, password: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[API /auth/login] Login attempt for email:', body.email);

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[API /auth/login] Gateway response status:', response.status);

    const data = await response.json();
    console.log('[API /auth/login] Response data keys:', Object.keys(data));

    // Decode and log JWT payload if token exists
    if (data.access_token) {
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        console.log('[API /auth/login] JWT payload:', payload);
        console.log('[API /auth/login] User role in token:', payload.role);
        console.log('[API /auth/login] User ID in token:', payload.sub || payload.userId);
      } catch (decodeErr) {
        console.error('[API /auth/login] Failed to decode JWT:', decodeErr);
      }
    } else {
      console.warn('[API /auth/login] No access_token in response');
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /auth/login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to login', message: error.message },
      { status: 500 }
    );
  }
}
