import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy: /api/newsletter/preferences/[userId]
 * Forwards requests to Social Service newsletter preferences endpoint
 *
 * GET - Fetch user's newsletter preferences
 * PATCH - Update user's newsletter preferences
 */

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const SOCIAL_SERVICE_URL = `${API_GATEWAY_URL}/api/v1/social`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId, 10);

    if (!userIdNum || userIdNum < 1) {
      return NextResponse.json(
        { success: false, message: 'Valid userId is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${SOCIAL_SERVICE_URL}/newsletter/preferences/${userIdNum}`
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Newsletter API] Error fetching preferences:', errorMsg);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch preferences', error: errorMsg },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId, 10);

    if (!userIdNum || userIdNum < 1) {
      return NextResponse.json(
        { success: false, message: 'Valid userId is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const response = await fetch(
      `${SOCIAL_SERVICE_URL}/newsletter/preferences/${userIdNum}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Newsletter API] Error updating preferences:', errorMsg);
    return NextResponse.json(
      { success: false, message: 'Failed to update preferences', error: errorMsg },
      { status: 500 }
    );
  }
}
