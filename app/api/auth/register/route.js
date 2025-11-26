import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * POST /api/auth/register - Proxy to User Service authentication via API Gateway
 * Body: { email: string, password: string, firstName: string, lastName: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/users/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /auth/register] Error:', error);
    return NextResponse.json(
      { error: 'Failed to register', message: error.message },
      { status: 500 }
    );
  }
}
