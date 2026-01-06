import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');

/**
 * POST /api/tenants/create
 * Creates a new organization for the current user and migrates them to it as admin
 * This is for users upgrading from the Free Community to their own organization
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT and extract user info
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;
    const currentTenantId = payload.tenantId as number;

    // Only allow users from Free Community (tenant ID 1) to upgrade
    if (currentTenantId !== 1) {
      return NextResponse.json(
        { message: 'You already have your own organization' },
        { status: 400 }
      );
    }

    if (!body.organizationName) {
      return NextResponse.json(
        { message: 'Organization name is required' },
        { status: 400 }
      );
    }

    // 1. Create new tenant
    const tenantResponse = await fetch(`${API_GATEWAY_URL}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: body.organizationName,
        tier: body.tier || 'free'
      })
    });

    if (!tenantResponse.ok) {
      const errorData = await tenantResponse.json();
      throw new Error(errorData.message || 'Failed to create organization');
    }

    const tenant = await tenantResponse.json();

    // 2. Update user's tenantId to new organization
    const userUpdateResponse = await fetch(`${API_GATEWAY_URL}/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        tenantId: tenant.id
      })
    });

    if (!userUpdateResponse.ok) {
      throw new Error('Failed to update user tenant');
    }

    // 3. Get admin role
    const rolesResponse = await fetch(`${API_GATEWAY_URL}/api/v1/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!rolesResponse.ok) {
      throw new Error('Failed to fetch roles');
    }

    const roles = await rolesResponse.json();
    const adminRole = roles.find((r: any) => r.name === 'admin');

    if (!adminRole) {
      throw new Error('Admin role not found');
    }

    // 4. Assign admin role to user in new organization
    await fetch(`${API_GATEWAY_URL}/api/v1/user-roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        roleId: adminRole.id,
        tenantId: tenant.id
      })
    });

    // 5. Remove user's old role from Free Community
    // (Optional - could keep for historical purposes)

    // 6. Generate new JWT token with updated tenantId and role
    const newTokenResponse = await fetch(`${API_GATEWAY_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        tenantId: tenant.id,
        role: 'admin'
      })
    });

    let newToken = null;
    if (newTokenResponse.ok) {
      const tokenData = await newTokenResponse.json();
      newToken = tokenData.access_token;
    }

    return NextResponse.json({
      message: 'Organization created successfully',
      tenant,
      access_token: newToken,
      note: 'Token updated with new organization'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /tenants/create] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
