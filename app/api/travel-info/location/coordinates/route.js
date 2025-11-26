import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/travel-info/location/coordinates?name=location
 * Proxy to Travel Info Service location coordinates endpoint via API Gateway
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required parameter: name' },
        { status: 400 }
      );
    }

    const url = `${API_GATEWAY_URL}/api/v1/travel-info/location/coordinates?name=${encodeURIComponent(name)}`;
    const response = await fetch(url);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /travel-info/location/coordinates] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coordinates', message: error.message },
      { status: 500 }
    );
  }
}
