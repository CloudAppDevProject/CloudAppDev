import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * Extract tenant namespace from hostname subdomain
 * Examples:
 *   - "acme.cloudappdev.site" → "acme"
 *   - "acme.cloudappdev.site:3000" → "acme"
 *   - "localhost:3000" → null
 *   - "cloudappdev.site" → null (no subdomain)
 *   - "dev.cloudappdev.site" → "dev"
 *
 * @param {string} host - The host header value
 * @returns {string|null} - The extracted subdomain or null
 */
function extractTenantNamespace(host) {
  if (!host) return null;

  // Strip port if present
  const hostname = host.split(':')[0];

  // Skip localhost and IP addresses
  if (hostname === 'localhost' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return null;
  }

  // Split by dots
  const parts = hostname.split('.');

  // Need at least 3 parts for a subdomain (e.g., "acme.cloudappdev.site")
  // Or 2 parts for local dev domains (e.g., "acme.localhost" won't work, but "acme.local" could)
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();
    // Exclude common non-tenant subdomains
    const excludedSubdomains = ['www', 'api', 'app', 'dev', 'staging', 'prod'];
    if (!excludedSubdomains.includes(subdomain)) {
      return subdomain;
    }
  }

  return null;
}

/**
 * POST /api/auth/register - Proxy to User Service authentication via API Gateway
 * Extracts tenant namespace from subdomain and forwards to User Service
 *
 * Body: {
 *   email: string,
 *   password: string,
 *   name: string
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { message: 'Missing required fields: email, password, and name are required' },
        { status: 400 }
      );
    }

    // Extract tenant namespace from subdomain
    const host = request.headers.get('host') || '';
    const tenantNamespace = extractTenantNamespace(host);

    console.log(`[API /auth/register] Host: ${host}, Extracted tenant namespace: ${tenantNamespace || '(none, will use default)'}`);

    // Forward to User Service via API Gateway with tenantNamespace in body
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        name: body.name,
        ...(tenantNamespace && { tenantNamespace }), // Only include if extracted
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch (err) {
      const raw = await response.text();
      console.error('[API /auth/register] Upstream returned non-JSON response:', raw);
      return NextResponse.json(
        { message: `Upstream returned non-JSON (status ${response.status})`, body: raw },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Registration failed' },
        { status: response.status }
      );
    }

    // Return access_token and user info
    return NextResponse.json({
      access_token: data.access_token,
      user: data.user
    }, { status: 200 });

  } catch (error) {
    console.error('[API /auth/register] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
