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
    const currentTenantUuid = payload.tenantUuid as string | undefined;

    // Determine the default free tenant UUID
    const defaultFreeNamespace = process.env.DEFAULT_TENANT_NAMESPACE || 'free';
    let defaultFreeTenantUuid: string | null = null;
    try {
      const defaultTenantResponse = await fetch(`${API_GATEWAY_URL}/api/v1/tenants/namespace/${defaultFreeNamespace}`);
      if (defaultTenantResponse.ok) {
        const dt = await defaultTenantResponse.json();
        defaultFreeTenantUuid = dt.uuid;
      }
    } catch (err) {
      console.warn('Could not resolve default free tenant UUID:', err instanceof Error ? err.message : String(err));
    }

    // Only allow users from Free Community to upgrade
    if (!currentTenantUuid || currentTenantUuid !== defaultFreeTenantUuid) {
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

    // 2. Update user's tenant to new organization (use tenant UUID)
    const userUpdateResponse = await fetch(`${API_GATEWAY_URL}/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        tenantUuid: tenant.uuid
      })
    });

    if (!userUpdateResponse.ok) {
      throw new Error('Failed to update user tenant');
    }

    // NOTE: roles/user-roles are no longer used. Instead:
    // 3. Set tenant owner email to the upgrading user's email so tenant-service recognizes them as admin
    try {
      await fetch(`${API_GATEWAY_URL}/api/v1/tenants/${tenant.uuid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: payload.email
        })
      });
    } catch (err) {
      console.warn('Failed to set tenant owner email:', err.message);
    }

    // 4. Generate new JWT token with updated tenantUuid and loginType (tenant_admin)
    const newTokenResponse = await fetch(`${API_GATEWAY_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        tenantUuid: tenant.uuid,
        loginType: 'tenant_admin'
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
