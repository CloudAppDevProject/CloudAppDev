import { NextResponse } from 'next/server';

const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || 'http://localhost:8082/api/v1';

/**
 * POST /api/comments - Create comment
 * Body: { userId: string, itineraryId: string, text: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${SOCIAL_SERVICE_URL}/comments`, {
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
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

/**
 * GET /api/comments?itineraryId=X - Get comments for itinerary
 * GET /api/comments?userId=X - Get user's comments
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itineraryId = searchParams.get('itineraryId');
    const userId = searchParams.get('userId');

    let url = `${SOCIAL_SERVICE_URL}/comments`;

    if (itineraryId) {
      url += `/itinerary/${itineraryId}`;
    } else if (userId) {
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
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Social Service Error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * PATCH /api/comments?id=X - Update comment
 * Body: { text: string }
 */
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
    }

    const response = await fetch(`${SOCIAL_SERVICE_URL}/comments/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Social Service Error:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

/**
 * DELETE /api/comments?id=X - Delete comment
 * DELETE /api/comments?itineraryId=X - Delete all comments for itinerary
 * DELETE /api/comments?userId=X - Delete all comments by user
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const itineraryId = searchParams.get('itineraryId');
    const userId = searchParams.get('userId');

    let url = `${SOCIAL_SERVICE_URL}/comments`;

    if (id) {
      url += `/${id}`;
    } else if (itineraryId) {
      url += `/itinerary/${itineraryId}`;
    } else if (userId) {
      url += `/user/${userId}`;
    } else {
      return NextResponse.json({ error: 'id, itineraryId, or userId required' }, { status: 400 });
    }

    const response = await fetch(url, {
      method: 'DELETE',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Social Service Error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
