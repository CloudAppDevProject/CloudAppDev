import { NextResponse } from 'next/server';

const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || 'http://localhost:8000/api/v1/social';

/**
 * POST /api/likes - Toggle like
 * Body: { userId: string, itineraryId: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${SOCIAL_SERVICE_URL}/likes/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Social Service Error:', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}

/**
 * GET /api/likes?itineraryId=X - Get likes for itinerary
 * GET /api/likes?userId=X - Get user's liked itineraries
 * GET /api/likes?userId=X&itineraryId=Y - Check if user liked itinerary
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itineraryId = searchParams.get('itineraryId');
    const userId = searchParams.get('userId');

    let url = `${SOCIAL_SERVICE_URL}/likes`;

    if (itineraryId && userId) {
      // Check if user liked itinerary
      url += `/check?userId=${userId}&itineraryId=${itineraryId}`;
    } else if (itineraryId) {
      // Get likes for itinerary
      url += `/itinerary/${itineraryId}`;
    } else if (userId) {
      // Get user's liked itineraries
      url += `/user/${userId}`;
    } else {
      return NextResponse.json({ error: 'itineraryId or userId required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // Normalize response: if checking like status, add hasLiked for frontend compatibility
    if (itineraryId && userId && data.liked !== undefined) {
      data.hasLiked = data.liked;
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Social Service Error:', error);
    return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 });
  }
}

/**
 * DELETE /api/likes?itineraryId=X - Delete all likes for itinerary
 * DELETE /api/likes?userId=X - Delete all likes by user
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itineraryId = searchParams.get('itineraryId');
    const userId = searchParams.get('userId');

    let url = `${SOCIAL_SERVICE_URL}/likes`;

    if (itineraryId) {
      url += `/itinerary/${itineraryId}`;
    } else if (userId) {
      url += `/user/${userId}`;
    } else {
      return NextResponse.json({ error: 'itineraryId or userId required' }, { status: 400 });
    }

    const response = await fetch(url, {
      method: 'DELETE',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Social Service Error:', error);
    return NextResponse.json({ error: 'Failed to delete likes' }, { status: 500 });
  }
}
