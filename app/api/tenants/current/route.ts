import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] [API /tenants/current] GET request initiated`);

  try {
    // Extract and validate token
    console.log(`[${requestId}] Extracting authorization token`);
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.warn(`[${requestId}] No authorization token provided`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[${requestId}] Token extracted successfully (length: ${token.length})`);

    // Verify JWT and extract tenantUuid
    let payload;
    let tenantUuid: string | undefined;

    try {
      console.log(`[${requestId}] Verifying JWT token`);
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
      tenantUuid = payload.tenantUuid as string | undefined;
      console.log(`[${requestId}] JWT verified successfully, tenantUuid: ${tenantUuid || 'undefined'}`);
    } catch (jwtError: any) {
      console.error(`[${requestId}] JWT verification failed:`, {
        error: jwtError.message,
        code: jwtError.code,
        name: jwtError.name
      });
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!tenantUuid) {
      console.warn(`[${requestId}] No tenantUuid found in JWT payload`);
      return NextResponse.json({ message: 'No tenant assigned' }, { status: 400 });
    }

    // Fetch tenant from Tenant Service by UUID
    console.log(`[${requestId}] Fetching tenant data from API Gateway: ${API_GATEWAY_URL}/api/v1/tenants/${tenantUuid}`);
    
    let response;
    try {
      response = await fetch(`${API_GATEWAY_URL}/api/v1/tenants/${tenantUuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`[${requestId}] Tenant service responded with status: ${response.status}`);
    } catch (fetchError: any) {
      console.error(`[${requestId}] Failed to connect to tenant service:`, {
        error: fetchError.message,
        url: `${API_GATEWAY_URL}/api/v1/tenants/${tenantUuid}`,
        cause: fetchError.cause
      });
      return NextResponse.json(
        { message: 'Failed to connect to tenant service' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error(`[${requestId}] Tenant service returned error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return NextResponse.json(
        { message: `Failed to fetch tenant: ${response.statusText}` },
        { status: response.status }
      );
    }

    let data;
    try {
      data = await response.json();
      console.log(`[${requestId}] Successfully parsed tenant data for tenantUuid: ${tenantUuid}`);
    } catch (jsonError: any) {
      console.error(`[${requestId}] Failed to parse JSON response from tenant service:`, {
        error: jsonError.message,
        responseBody: await response.text().catch(() => 'Unable to read response body')
      });
      return NextResponse.json(
        { message: 'Failed to process tenant data' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API /tenants/current] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
