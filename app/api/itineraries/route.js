import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';
const ITINERARY_SERVICE_URL = `${API_GATEWAY_URL}/api/v1/itineraries`;

export async function POST(req) {
  try {
    const token = req.headers.get('Authorization');
    const body = await req.json();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = token;
    }

    const response = await fetch(`${ITINERARY_SERVICE_URL}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Itinerary Service Error:', error);
    return NextResponse.json({ error: 'Failed to create itinerary' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const token = req.headers.get('Authorization');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    console.log('[API /api/itineraries GET] Request received');
    console.log('[API /api/itineraries GET] Token:', token ? 'Present' : 'Missing');
    console.log('[API /api/itineraries GET] Params:', { id, userId, search, page, limit });

    let url = `${ITINERARY_SERVICE_URL}`;

    if (id) {
      url = `${ITINERARY_SERVICE_URL}/${id}`;
    } else {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (search) params.append('search', search);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);

      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }

    console.log('[API /api/itineraries GET] Forwarding to:', url);

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = token;
    }

    console.log('[API /api/itineraries GET] Headers:', headers);

    const response = await fetch(url, { headers });

    console.log('[API /api/itineraries GET] Backend response status:', response.status);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Itinerary Service Error:', error);
    return NextResponse.json({ error: 'Failed to fetch itineraries' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const token = req.headers.get('Authorization');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = token;
    }

    const response = await fetch(`${ITINERARY_SERVICE_URL}/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Itinerary Service Error:', error);
    return NextResponse.json({ error: 'Failed to update itinerary' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const token = req.headers.get('Authorization');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = token;
    }

    const response = await fetch(`${ITINERARY_SERVICE_URL}/${id}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Itinerary Service Error:', error);
    return NextResponse.json({ error: 'Failed to delete itinerary' }, { status: 500 });
  }
}
