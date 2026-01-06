import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/tenants/:id
 * Fetch specific tenant details
 * Protected by TenantAuthGuard - users can only access their own tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const token = request.headers.get('Authorization');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/tenants/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch tenant' },
        { status: response.status }
      );
    }

    const tenant = await response.json();
    return NextResponse.json(tenant, { status: 200 });

  } catch (error: any) {
    console.error(`[API /api/tenants/${params.id}] GET Error:`, error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenants/:id
 * Update tenant settings (name, tier, etc.)
 * Protected by AdminGuard - only admins can update tenant settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const token = request.headers.get('Authorization');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/tenants/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to update tenant' },
        { status: response.status }
      );
    }

    const updatedTenant = await response.json();
    return NextResponse.json(updatedTenant, { status: 200 });

  } catch (error: any) {
    console.error(`[API /api/tenants/${params.id}] PATCH Error:`, error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
