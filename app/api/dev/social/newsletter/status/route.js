import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/dev/social/newsletter/status
 * Proxy to Social Service newsletter status endpoint via API Gateway
 */
export async function GET(request) {
  try {
    const url = `${API_GATEWAY_URL}/api/v1/social/newsletter/status`;
    const response = await fetch(url);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /dev/social/newsletter/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter status', message: error.message },
      { status: 500 }
    );
  }
}
