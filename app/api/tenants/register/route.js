import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * POST /api/tenants/register - Create a new tenant organization
 * Body: { name: string, tier: string, ownerEmail: string, ownerName: string, ownerFirebaseUid: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/users/tenants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /tenants/register] Error:', error);
    return NextResponse.json(
      { error: 'Failed to register tenant', message: error.message },
      { status: 500 }
    );
  }
}
