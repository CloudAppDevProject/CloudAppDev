import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/signed-url?path=gs://...&service=itinerary|user
 * Proxy to get signed URLs from User Service or Itinerary Service via API Gateway
 * Default service is 'itinerary'
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const service = searchParams.get('service') || 'itinerary';

    if (!path) {
      return NextResponse.json(
        { error: 'Missing required parameter: path' },
        { status: 400 }
      );
    }

    // Route through API Gateway to the appropriate service
    const endpoint = service === 'user' ? 'users' : 'itineraries';
    const url = `${API_GATEWAY_URL}/api/v1/${endpoint}/signed-url?path=${encodeURIComponent(path)}`;

    const response = await fetch(url);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /signed-url] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get signed URL', message: error.message },
      { status: 500 }
    );
  }
}
