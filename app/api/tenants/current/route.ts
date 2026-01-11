import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT and extract tenantUuid
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const tenantUuid = payload.tenantUuid as string | undefined;

    if (!tenantUuid) {
      return NextResponse.json({ message: 'No tenant assigned' }, { status: 400 });
    }

    // Fetch tenant from Tenant Service by UUID
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/tenants/${tenantUuid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tenant');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API /tenants/current] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
