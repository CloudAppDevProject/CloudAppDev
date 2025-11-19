import { NextResponse } from 'next/server';

const ITINERARY_SERVICE_URL = process.env.ITINERARY_SERVICE_URL || 'http://localhost:8000/api/v1/itineraries';

export async function POST(req) {
  try {
    const body = await req.json();
    
    const response = await fetch(`${ITINERARY_SERVICE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

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

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Itinerary Service Error:', error);
    return NextResponse.json({ error: 'Failed to fetch itineraries' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const response = await fetch(`${ITINERARY_SERVICE_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const response = await fetch(`${ITINERARY_SERVICE_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Itinerary Service Error:', error);
    return NextResponse.json({ error: 'Failed to delete itinerary' }, { status: 500 });
  }
}
