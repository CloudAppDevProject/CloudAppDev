import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/user-roles/:userId
 * Fetch roles for a specific user within the current tenant
 * Protected by TenantAuthGuard - users can only query roles within their own tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const token = request.headers.get('Authorization');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/user-roles/user/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch user roles' },
        { status: response.status }
      );
    }

    const userRoles = await response.json();
    return NextResponse.json(userRoles, { status: 200 });

  } catch (error: any) {
    console.error(`[API /api/user-roles/${params.userId}] Error:`, error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
