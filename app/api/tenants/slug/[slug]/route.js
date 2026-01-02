import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/tenants/slug/[slug] - Get tenant by slug
 */
export async function GET(request, { params }) {
  try {
    const { slug } = params;

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/users/tenants/slug/${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /tenants/slug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant', message: error.message },
      { status: 500 }
    );
  }
}
