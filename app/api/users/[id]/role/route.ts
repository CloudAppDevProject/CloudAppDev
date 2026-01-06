import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const body = await request.json();
    const userId = params.id;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT and extract tenantId and role
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const tenantId = payload.tenantId as number;
    const userRole = payload.role as string;

    // Only admins can change roles
    if (userRole !== 'admin') {
      return NextResponse.json(
        { message: 'Only admins can change user roles' },
        { status: 403 }
      );
    }

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

    // Step 1: Get existing user roles
    const existingRolesResponse = await fetch(`${API_GATEWAY_URL}/api/v1/user-roles/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!existingRolesResponse.ok) {
      throw new Error('Failed to fetch existing user roles');
    }

    const existingRoles = await existingRolesResponse.json();
    
    // Step 2: Delete old role(s) for this tenant
    for (const existingRole of existingRoles) {
      if (existingRole.tenantId === tenantId) {
        await fetch(`${API_GATEWAY_URL}/api/v1/user-roles/${existingRole.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
      }
    }

    // Step 3: Assign new role in Tenant Service
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/user-roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: parseInt(userId),
        roleId: role.id,
        tenantId: tenantId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update role');
    }

    const data = await response.json();
    return NextResponse.json({
      message: 'Role updated successfully',
      data
    });

  } catch (error: any) {
    console.error('[API /users/:id/role] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
