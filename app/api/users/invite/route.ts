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

    // Verify JWT and extract tenantId
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const tenantId = payload.tenantId as number;
    const userRole = payload.role as string;

    // Only admins can invite users
    if (userRole !== 'admin') {
      return NextResponse.json(
        { message: 'Only admins can invite users' },
        { status: 403 }
      );
    }

    // Create user in User Service
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        tenantId: tenantId,
        // Generate temporary password or send invitation email
        password: Math.random().toString(36).slice(-8) + 'Aa1!'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create user');
    }

    const userData = await response.json();

    // Assign role to user in Tenant Service
    if (body.role) {
      // Fetch roles to get the correct roleId dynamically
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
      const role = roles.find((r: any) => r.name.toLowerCase() === body.role.toLowerCase());

      if (!role) {
        throw new Error(`Role '${body.role}' not found`);
      }

      await fetch(`${API_GATEWAY_URL}/api/v1/user-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userData.id,
          roleId: role.id,
          tenantId: tenantId
        })
      });
    }

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
