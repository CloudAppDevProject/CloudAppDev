import { NextResponse } from 'next/server';

// Public proxy endpoint used by the registration wizard to validate namespaces.
// Intentionally public (no middleware auth); the backend tenant-service validates and enforces reserved namespaces.
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace');

    if (!namespace) {
      return NextResponse.json(
        { error: 'Namespace parameter is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_GATEWAY_URL}/api/v1/tenants/namespace/${encodeURIComponent(namespace)}/check`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /register/check-namespace] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check namespace', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
