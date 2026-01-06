import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/roles
 * Fetch all available roles from Tenant Service
 * Used for dynamic role selection in admin panels
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/roles`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch roles' },
        { status: response.status }
      );
    }

    const roles = await response.json();
    return NextResponse.json(roles, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/roles] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
