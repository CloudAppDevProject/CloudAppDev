import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/auth/me - Get current authenticated user
 * Requires: Authorization header with Bearer token
 * Returns: User object with tenantUuid and loginType
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

    // Forward to User Service via API Gateway
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: token
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch user' },
        { status: response.status }
      );
    }

    const userData = await response.json();
    return NextResponse.json(userData);

  } catch (error: any) {
    console.error('[API /auth/me] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
