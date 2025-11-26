import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * PATCH /api/itineraries/locations/[id] - Update location in itinerary via API Gateway
 * Body: { name, latitude, longitude, start_date, end_date, short_desc, images }
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const url = `${API_GATEWAY_URL}/api/v1/itineraries/locations/${id}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /itineraries/locations/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update location', message: error.message },
      { status: 500 }
    );
  }
}
