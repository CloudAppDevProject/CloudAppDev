import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_CREDENTIALS_BASE64 = process.env.GCP_MONITORING_CREDENTIALS_BASE64;

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

async function verifyAdminToken(request: NextRequest): Promise<{ valid: boolean; userId?: number; role?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false };
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== 'admin') {
      return { valid: false };
    }

    return {
      valid: true,
      userId: payload.userId as number,
      role: payload.role as string,
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

    const credentials = JSON.parse(
      Buffer.from(GCP_CREDENTIALS_BASE64, 'base64').toString('utf-8')
    );

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

  const presets: Record<string, MetricsRequest> = {
    // CPU usage by service (default Node.js metrics)
    'requests-by-tenant': {
      metricType: 'prometheus.googleapis.com/process_cpu_seconds_total/counter',
      aggregation: {
        alignmentPeriod: '60s',
        perSeriesAligner: 'ALIGN_RATE',
        crossSeriesReducer: 'REDUCE_SUM',
        groupByFields: ['metric.label.service'],
      },
    },
    // Memory usage by service (default Node.js metrics)
    'errors-by-tenant': {
      metricType: 'prometheus.googleapis.com/nodejs_heap_size_used_bytes/gauge',
      aggregation: {
        alignmentPeriod: '60s',
        perSeriesAligner: 'ALIGN_MEAN',
        crossSeriesReducer: 'REDUCE_MEAN',
        groupByFields: ['metric.label.service'],
      },
    },
    // Service health (up metric from Prometheus)
    'service-health': {
      metricType: 'prometheus.googleapis.com/up/gauge',
      aggregation: {
        alignmentPeriod: '60s',
        perSeriesAligner: 'ALIGN_MEAN',
        crossSeriesReducer: 'REDUCE_MEAN',
        groupByFields: ['metric.label.service'],
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

  // Forward to POST handler with preset configuration
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(presets[preset]),
    })
  );
}
