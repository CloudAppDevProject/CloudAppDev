import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * POST /api/upload?service=user|itinerary
 * Proxy file uploads to the appropriate service via API Gateway
 * Handles multipart/form-data from client-side file uploads
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service') || 'itinerary';
    const authHeader = request.headers.get('authorization');

    if (!service || !['user', 'itinerary'].includes(service)) {
      return NextResponse.json(
        { error: 'Invalid service parameter' },
        { status: 400 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Determine the endpoint based on service
    const endpoint = service === 'user' ? 'users' : 'itineraries';
    const url = `${API_GATEWAY_URL}/api/v1/${endpoint}/upload`;

    // Forward the multipart request to the API Gateway
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: authHeader ? { Authorization: authHeader } : undefined,
      // Note: Don't set Content-Type header - let fetch set it automatically for multipart/form-data
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', message: error.message },
      { status: 500 }
    );
  }
}
