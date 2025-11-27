import { NextRequest, NextResponse } from 'next/server';

/**
 * DEV ENDPOINT: /api/dev/newsletter/send
 *
 * Proxy endpoint to manually trigger newsletter sends in development/deployment
 * Forwards request to the Social Service Newsletter API
 *
 * Supports both GET and POST:
 *
 * GET /api/dev/newsletter/send?userId=1
 *   URL params: userId (required)
 *
 * POST /api/dev/newsletter/send
 *   Body: { "userId": 1 }
 *
 * Response: 202 Accepted with newsletter send result
 *
 * NOTE: This is a development/admin endpoint and should be protected in production!
 */

async function sendNewsletter(userId: string | number) {
  const userIdNum = parseInt(String(userId), 10);

  if (!userIdNum || userIdNum < 1) {
    return {
      success: false,
      message: 'Valid userId is required',
      status: 400,
    };
  }

  try {
    // Use direct Social Service URL (bypasses API Gateway for local dev)
    // For production, use API Gateway instead
    const socialServiceUrl =
      `${process.env.API_GATEWAY_URL}/api/v1/social` || "http://localhost:8082";
    const fullUrl = `${socialServiceUrl}/newsletter/send-manual/${userIdNum}`;

    console.log(`[DEV] Sending newsletter for userId: ${userIdNum} to ${socialServiceUrl}`);

    // Forward request to Social Service
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[DEV] Newsletter send failed: ${response.status}`, data);
      return {
        ...data,
        status: response.status,
      };
    }

    console.log(`[DEV] Newsletter sent successfully for userId: ${userIdNum}`);
    return {
      ...data,
      status: 202,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[DEV] Newsletter endpoint error:', errorMsg);
    return {
      success: false,
      message: 'Failed to send newsletter',
      error: errorMsg,
      status: 500,
    };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { success: false, message: 'userId query parameter is required' },
      { status: 400 }
    );
  }

  const result = await sendNewsletter(userId);
  const { status, ...data } = result;

  return NextResponse.json(data, { status: status || 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await sendNewsletter(userId);
    const { status, ...data } = result;

    return NextResponse.json(data, { status: status || 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[DEV] Newsletter endpoint error:', errorMsg);
    return NextResponse.json(
      { success: false, message: 'Failed to send newsletter', error: errorMsg },
      { status: 500 }
    );
  }
}
