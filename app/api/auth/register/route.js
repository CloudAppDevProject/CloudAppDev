import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * POST /api/auth/register - Proxy to User Service authentication via API Gateway
 * Creates a normal user and assigns them to the default "Free Community" tenant
 *
 * Body: {
 *   email: string,
 *   password: string,
 *   name: string
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { message: 'Missing required fields: email, password, and name are required' },
        { status: 400 }
      );
    }

    // Forward to User Service via API Gateway
    // User will be automatically assigned to the default tenant (ID: 1)
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        name: body.name
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Registration failed' },
        { status: response.status }
      );
    }

    // Return access_token and user info
    return NextResponse.json({
      access_token: data.access_token,
      user: data.user
    }, { status: 200 });

  } catch (error) {
    console.error('[API /auth/register] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
