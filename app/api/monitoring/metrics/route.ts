import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_CREDENTIALS_BASE64 = process.env.GCP_MONITORING_CREDENTIALS_BASE64;
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

/**
 * GCP Cloud Monitoring API Proxy
 *
 * Queries GCP Cloud Monitoring for metrics across ALL tenant clusters.
 * This is the only source that has multi-cluster data (Prometheus is per-cluster).
 *
 * Admin-only access via JWT verification.
 *
 * Usage: POST /api/monitoring/metrics
 * Body: {
 *   metricType: "prometheus.googleapis.com/http_requests_total/counter",
 *   aggregation: { ... },
 *   filter: "tenant_id=\"2\""
 * }
 */

interface MetricsRequest {
  metricType: string;
  aggregation?: {
    alignmentPeriod?: string; // e.g., "60s"
    perSeriesAligner?: string; // e.g., "ALIGN_RATE"
    crossSeriesReducer?: string; // e.g., "REDUCE_SUM"
    groupByFields?: string[]; // e.g., ["tenant_id"]
  };
  filter?: string; // e.g., 'tenant_id="2"'
  interval?: {
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
  };
}

async function verifyAdminToken(request: NextRequest): Promise<{ valid: boolean; userId?: number; email?: string; tenantUuid?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Monitoring API] No authorization header');
      return { valid: false };
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userEmail = payload.email as string | undefined;
    const tenantUuid = payload.tenantUuid as string | undefined;

    if (!userEmail || !tenantUuid) {
      console.log('[Monitoring API] Missing email or tenantUuid in token');
      return { valid: false };
    }

    // Fetch tenant to verify user is the tenant admin (email match)
    console.log('[Monitoring API] Fetching tenant for admin verification...');
    const tenantResponse = await fetch(`${API_GATEWAY_URL}/api/v1/tenants/${tenantUuid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!tenantResponse.ok) {
      console.error('[Monitoring API] Failed to fetch tenant:', tenantResponse.status);
      return { valid: false };
    }

    const tenant = await tenantResponse.json();
    console.log('[Monitoring API] User email:', userEmail, 'Tenant admin email:', tenant.email);

    // Verify user email matches tenant admin email
    if (userEmail !== tenant.email) {
      console.error('[Monitoring API] Access denied - email mismatch');
      return { valid: false };
    }

    console.log('[Monitoring API] Admin access verified (email match confirmed)');
    return {
      valid: true,
      userId: payload.userId as number,
      email: userEmail,
      tenantUuid,
    };
  } catch (error) {
    console.error('[Monitoring API] Token verification failed:', error);
    return { valid: false };
  }
}

async function getGCPAccessToken(): Promise<string | null> {
  try {
    if (!GCP_CREDENTIALS_BASE64) {
      console.warn('[Monitoring API] No GCP credentials configured, using local Prometheus instead');
      return null;
    }

    // Handle both raw JSON and base64-encoded JSON
    // Kubernetes secrets are automatically base64-decoded when injected as env vars,
    // so we may receive raw JSON. Try parsing as JSON first, then fall back to base64.
    let credentials;
    try {
      // First, try parsing as raw JSON (Kubernetes already decoded the secret)
      credentials = JSON.parse(GCP_CREDENTIALS_BASE64);
    } catch {
      // If that fails, try decoding as base64 first (for local development)
      credentials = JSON.parse(
        Buffer.from(GCP_CREDENTIALS_BASE64, 'base64').toString('utf-8')
      );
    }

    // Use Google Auth Library to get access token
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/monitoring.read'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
  } catch (error: any) {
    console.error('[Monitoring API] Failed to get GCP access token:', error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Verify admin access
  const auth = await verifyAdminToken(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const body: MetricsRequest = await request.json();

    if (!GCP_PROJECT_ID) {
      return NextResponse.json(
        { error: 'GCP_PROJECT_ID not configured. Set this in .env file.' },
        { status: 500 }
      );
    }

    const accessToken = await getGCPAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'GCP credentials not configured',
          message: 'Set GCP_MONITORING_CREDENTIALS_BASE64 in .env or use Workload Identity in production',
          fallback: 'Use local Prometheus at http://localhost:9090 for development',
        },
        { status: 500 }
      );
    }

    // Set default time range (last 1 hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const interval = body.interval || {
      startTime: oneHourAgo.toISOString(),
      endTime: now.toISOString(),
    };

    // Build GCP Cloud Monitoring API request
    const apiUrl = `https://monitoring.googleapis.com/v3/projects/${GCP_PROJECT_ID}/timeSeries`;

    const queryParams = new URLSearchParams({
      filter: `metric.type="${body.metricType}"${body.filter ? ' AND ' + body.filter : ''}`,
      'interval.startTime': interval.startTime,
      'interval.endTime': interval.endTime,
    });

    // Add aggregation if provided
    if (body.aggregation) {
      if (body.aggregation.alignmentPeriod) {
        queryParams.append('aggregation.alignmentPeriod', body.aggregation.alignmentPeriod);
      }
      if (body.aggregation.perSeriesAligner) {
        queryParams.append('aggregation.perSeriesAligner', body.aggregation.perSeriesAligner);
      }
      if (body.aggregation.crossSeriesReducer) {
        queryParams.append('aggregation.crossSeriesReducer', body.aggregation.crossSeriesReducer);
      }
      if (body.aggregation.groupByFields) {
        body.aggregation.groupByFields.forEach((field) => {
          queryParams.append('aggregation.groupByFields', field);
        });
      }
    }

    console.log(`[Monitoring API] Querying GCP: ${apiUrl}?${queryParams.toString()}`);

    const response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Monitoring API] GCP API error:', errorText);
      return NextResponse.json(
        {
          error: 'Failed to query GCP Cloud Monitoring',
          status: response.status,
          message: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      metricType: body.metricType,
      interval,
      data: data.timeSeries || [],
      nextPageToken: data.nextPageToken,
    });
  } catch (error: any) {
    console.error('[Monitoring API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for predefined metrics queries
 * Useful for quick access without building complex queries
 *
 * Query params:
 * - preset: The metric preset to use (requests-by-tenant, errors-by-tenant, service-health)
 * - startTime: ISO 8601 start time (optional, defaults to 1 hour ago)
 * - endTime: ISO 8601 end time (optional, defaults to now)
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const preset = searchParams.get('preset');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  // Calculate alignment period based on time range for better visualization
  const getAlignmentPeriod = (start?: string, end?: string): string => {
    if (!start || !end) return '60s';

    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Adjust alignment period for better chart resolution
    if (durationHours <= 0.5) return '30s';      // 30 min or less: 30s intervals
    if (durationHours <= 1) return '60s';        // 1 hour: 1 min intervals
    if (durationHours <= 6) return '120s';       // 6 hours: 2 min intervals
    if (durationHours <= 24) return '300s';      // 24 hours: 5 min intervals
    if (durationHours <= 168) return '1800s';    // 7 days: 30 min intervals
    return '3600s';                               // More: 1 hour intervals
  };

  const alignmentPeriod = getAlignmentPeriod(startTime || undefined, endTime || undefined);

  const presets: Record<string, MetricsRequest> = {
    // CPU usage by namespace using Prometheus metrics
    'requests-by-tenant': {
      metricType: 'prometheus.googleapis.com/container_cpu_usage_seconds_total/counter',
      aggregation: {
        alignmentPeriod,
        perSeriesAligner: 'ALIGN_RATE',
        crossSeriesReducer: 'REDUCE_SUM',
        groupByFields: ['resource.labels.namespace'],
      },
    },
    // Memory usage by namespace
    'errors-by-tenant': {
      metricType: 'prometheus.googleapis.com/container_memory_working_set_bytes/gauge',
      aggregation: {
        alignmentPeriod,
        perSeriesAligner: 'ALIGN_MEAN',
        crossSeriesReducer: 'REDUCE_MEAN',
        groupByFields: ['resource.labels.namespace'],
      },
    },
    // Network traffic by namespace
    'service-health': {
      metricType: 'prometheus.googleapis.com/container_network_receive_bytes_total/counter',
      aggregation: {
        alignmentPeriod,
        perSeriesAligner: 'ALIGN_RATE',
        crossSeriesReducer: 'REDUCE_SUM',
        groupByFields: ['resource.labels.namespace'],
      },
    },
  };

  if (!preset || !presets[preset]) {
    return NextResponse.json(
      {
        error: 'Invalid preset',
        availablePresets: Object.keys(presets),
      },
      { status: 400 }
    );
  }

  // Add custom time interval if provided
  const presetConfig = { ...presets[preset] };
  if (startTime && endTime) {
    presetConfig.interval = {
      startTime,
      endTime,
    };
  }

  // Forward to POST handler with preset configuration
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(presetConfig),
    })
  );
}
