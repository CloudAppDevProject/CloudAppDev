import { NextResponse } from 'next/server';

const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || 'http://localhost:8000/api/v1/social';

/**
 * POST /api/likes/batch - Get like counts and user status for multiple itineraries
 * Body: { itineraryIds: string[], userId?: string }
 * Response: { counts: { [itineraryId]: count }, userLiked?: { [itineraryId]: boolean } }
 *
 * This batch endpoint reduces N+1 API calls to a single call.
 * Instead of making 20 calls (10 for counts + 10 for user status),
 * the frontend can now make just 1 call to get all data.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.itineraryIds || !Array.isArray(body.itineraryIds) || body.itineraryIds.length === 0) {
      return NextResponse.json(
        { error: 'itineraryIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    const response = await fetch(`${SOCIAL_SERVICE_URL}/likes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch batch likes data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Social Service Batch Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch likes data' },
      { status: 500 }
    );
  }
}
