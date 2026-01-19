import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * Extract tenant namespace from hostname subdomain
 * Examples:
 *   - "acme.cloudappdev.site" → "acme"
 *   - "acme.cloudappdev.site:3000" → "acme"
 *   - "localhost:3000" → null
 *   - "cloudappdev.site" → null (no subdomain)
 *
 * @param {string} host - The host header value
 * @returns {string|null} - The extracted subdomain or null
 */
function extractTenantNamespace(host) {
  if (!host) return null;

  // Remove port if present
  const hostWithoutPort = host.split(':')[0];

  // Split by dots
  const parts = hostWithoutPort.split('.');

  // If localhost or single domain (no subdomain), return null
  if (parts.length <= 2 || hostWithoutPort.includes('localhost')) {
    return null;
  }

  // First part is the subdomain
  const subdomain = parts[0];

  // Exclude common non-tenant subdomains
  const excludedSubdomains = ['www', 'api', 'app', 'dev', 'staging', 'prod'];
  if (!excludedSubdomains.includes(subdomain)) {
    return subdomain;
  }

  return null;
}

/**
 * POST /api/auth/login - Proxy to User Service authentication via API Gateway
 * Extracts tenant namespace from subdomain and validates tenant access
 * Body: { email: string, password: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[API /auth/login] Login attempt for email:', body.email);

    // Extract tenant namespace from subdomain
    const host = request.headers.get('host') || '';
    const tenantNamespace = extractTenantNamespace(host);
    console.log('[API /auth/login] Host:', host, 'Extracted tenant namespace:', tenantNamespace || '(none)');

    const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        ...(tenantNamespace && { tenantNamespace }), // Only include if extracted
      }),
    });

    console.log('[API /auth/login] Gateway response status:', response.status);

    const data = await response.json();
    console.log('[API /auth/login] Response data keys:', Object.keys(data));

    // If response is not ok, pass through the error from backend
    if (!response.ok) {
      console.error('[API /auth/login] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    // Decode and log JWT payload if token exists
    if (data.access_token) {
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        console.log('[API /auth/login] JWT payload:', payload);
        console.log('[API /auth/login] User loginType in token:', payload.loginType);
        console.log('[API /auth/login] User ID in token:', payload.sub || payload.userId);
      } catch (decodeErr) {
        console.error('[API /auth/login] Failed to decode JWT:', decodeErr);
      }
    } else {
      console.warn('[API /auth/login] No access_token in response');
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /auth/login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to login', message: error.message },
      { status: 500 }
    );
  }
}
