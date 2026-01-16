import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8000';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');

/**
 * Verify if the user is a tenant admin by checking if their email matches a tenant's email
 * Routes through API Gateway to reach tenant-service
 */
async function verifyTenantAdmin(email: string): Promise<{ isAdmin: boolean; tenantUuid: string | null }> {
  try {
    // Route through API Gateway which forwards to tenant-service
    const response = await fetch(
      `${API_GATEWAY_URL}/api/v1/tenants/check-admin-email/${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      console.error('[Admin Check] Tenant service returned error:', response.status);
      return { isAdmin: false, tenantUuid: null };
    }

    const data = await response.json();
    return {
      isAdmin: data.isAdmin ?? false,
      tenantUuid: data.tenantUuid ?? null
    };
  } catch (error) {
    console.error('[Admin Check] Failed to verify admin status:', error);
    return { isAdmin: false, tenantUuid: null };
  }
}

/**
 * POST /api/admin/users - Add a new user to the tenant
 * Only tenant admins (user.email === tenant.email) can add users
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT and extract user email
    let payload;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload;
    } catch (jwtError) {
      console.error('[API /admin/users] JWT verification failed:', jwtError);
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const userEmail = payload.email as string;
    if (!userEmail) {
      return NextResponse.json({ message: 'Invalid token: no email' }, { status: 401 });
    }

    // Verify user is a tenant admin by checking if their email matches a tenant
    const { isAdmin, tenantUuid } = await verifyTenantAdmin(userEmail);

    if (!isAdmin) {
      return NextResponse.json(
        { message: 'Access denied. Only tenant administrators can add users.' },
        { status: 403 }
      );
    }

    if (!tenantUuid) {
      return NextResponse.json(
        { message: 'Could not determine tenant' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Create user in User Service with the tenant's UUID
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password,
        tenantUuid: tenantUuid
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API /admin/users] User creation failed:', errorData);
      throw new Error(errorData.message || 'Failed to create user');
    }

    const userData = await response.json();

    return NextResponse.json({
      message: 'User added successfully',
      user: userData
    });

  } catch (error: any) {
    console.error('[API /admin/users] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
