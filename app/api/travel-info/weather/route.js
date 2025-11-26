import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GET /api/travel-info/weather?q=location&days=N&lang=de
 * Proxy to Travel Info Service weather endpoint via API Gateway
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const days = searchParams.get('days') || '7';
    const lang = searchParams.get('lang') || 'en';

    if (!q) {
      return NextResponse.json(
        { error: 'Missing required parameter: q' },
        { status: 400 }
      );
    }

    const url = `${API_GATEWAY_URL}/api/v1/travel-info/weather?q=${encodeURIComponent(q)}&days=${days}&lang=${lang}`;
    const response = await fetch(url);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /travel-info/weather] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather', message: error.message },
      { status: 500 }
    );
  }
}
