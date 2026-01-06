import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/itineraries/:id - Get single itinerary by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization');
    const itineraryId = params.id;

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers.Authorization = token;
    }

    const response = await fetch(
      `${API_GATEWAY_URL}/api/v1/itineraries/${itineraryId}`,
      { headers }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('[API /itineraries/:id GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch itinerary', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/itineraries/:id - Update itinerary
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization');
    const itineraryId = params.id;
    const body = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${API_GATEWAY_URL}/api/v1/itineraries/${itineraryId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('[API /itineraries/:id PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update itinerary', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/itineraries/:id - Delete itinerary
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization');
    const itineraryId = params.id;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${API_GATEWAY_URL}/api/v1/itineraries/${itineraryId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: token
        }
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('[API /itineraries/:id DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete itinerary', message: error.message },
      { status: 500 }
    );
  }
}
