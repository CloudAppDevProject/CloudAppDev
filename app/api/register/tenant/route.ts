import { NextResponse } from 'next/server';

// Public proxy endpoint used by the registration wizard to create a tenant and admin account.
// Intentionally public (no middleware auth); tenant-service performs all necessary validation and security checks.
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/tenants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[API /register/tenant] Error:', error);
    return NextResponse.json(
      { error: 'Failed to register tenant', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
