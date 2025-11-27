import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy: /api/newsletter/subscribe/[userId]
 * Forwards requests to Social Service newsletter subscribe endpoint
 *
 * DELETE - Unsubscribe user from newsletter
 */

const SOCIAL_SERVICE_URL =
  `${process.env.API_GATEWAY_URL}/api/v1/social` || "http://localhost:8082";

export async function DELETE(
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
      `${SOCIAL_SERVICE_URL}/newsletter/subscribe/${userIdNum}`,
      {
        method: 'DELETE',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Newsletter API] Error unsubscribing:', errorMsg);
    return NextResponse.json(
      { success: false, message: 'Failed to unsubscribe', error: errorMsg },
      { status: 500 }
    );
  }
}
