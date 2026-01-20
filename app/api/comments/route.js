import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const SOCIAL_SERVICE_URL = `${API_GATEWAY_URL}/api/v1/social`;
const USER_SERVICE_URL = `${API_GATEWAY_URL}/api/v1/users`;

// Fetch a single user record; return null on failure to keep comments resilient
async function fetchUser(userId) {
  try {
    const response = await fetch(`${USER_SERVICE_URL}/${userId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error(`User Service Error for user ${userId}:`, err);
    return null;
  }
}

async function buildUserMap(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      const user = await fetchUser(id);
      return user ? [Number(id), user] : null;
    })
  );

  return new Map(entries.filter(Boolean));
}

async function attachUserNamesToComments(comments = []) {
  const userMap = await buildUserMap(comments.map((c) => c.userId));
  return comments.map((comment) => ({
    ...comment,
    userName: userMap.get(Number(comment.userId))?.name || null
  }));
}

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
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const user = await fetchUser(body.userId);
    const enrichedComment = {
      ...data,
      userId: data.userId ?? body.userId,
      userName: user?.name || data.userName || null
    };

    return NextResponse.json(enrichedComment, { status: response.status });
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

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    if (Array.isArray(data)) {
      const commentsWithNames = await attachUserNamesToComments(data);
      return NextResponse.json(commentsWithNames, { status: response.status });
    }

    if (data?.comments && Array.isArray(data.comments)) {
      const commentsWithNames = await attachUserNamesToComments(data.comments);
      return NextResponse.json(
        {
          ...data,
          comments: commentsWithNames,
        },
        { status: response.status }
      );
    }

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
