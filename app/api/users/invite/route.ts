import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT and extract tenantUuid and loginType
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const tenantUuid = payload.tenantUuid as string | undefined;
    const loginType = payload.loginType as string;

    // Only tenant admins can invite users
    if (loginType !== 'tenant_admin') {
      return NextResponse.json(
        { message: 'Only tenant admins can invite users' },
        { status: 403 }
      );
    }

    // Create user in User Service (pass tenantUuid)
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        tenantUuid: tenantUuid,
        // Generate temporary password
        password: Math.random().toString(36).slice(-8) + 'Aa1!'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create user');
    }

    const userData = await response.json();

    return NextResponse.json({
      message: 'User invited successfully',
      user: userData
    });

  } catch (error: any) {
    console.error('[API /users/invite] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
