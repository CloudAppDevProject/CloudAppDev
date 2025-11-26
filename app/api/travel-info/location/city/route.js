import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/travel-info/location/city?lat=X&lon=Y
 * Proxy to Travel Info Service location city endpoint via API Gateway
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 }
      );
    }

    const url = `${API_GATEWAY_URL}/api/v1/travel-info/location/city?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const response = await fetch(url);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /travel-info/location/city] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city', message: error.message },
      { status: 500 }
    );
  }
}
