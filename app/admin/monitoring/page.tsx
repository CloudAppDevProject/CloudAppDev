'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

// Time range presets
const TIME_RANGE_PRESETS = [
  { label: 'Last 15 minutes', value: '15m', ms: 15 * 60 * 1000 },
  { label: 'Last 30 minutes', value: '30m', ms: 30 * 60 * 1000 },
  { label: 'Last 1 hour', value: '1h', ms: 60 * 60 * 1000 },
  { label: 'Last 3 hours', value: '3h', ms: 3 * 60 * 60 * 1000 },
  { label: 'Last 6 hours', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: 'Last 12 hours', value: '12h', ms: 12 * 60 * 60 * 1000 },
  { label: 'Last 24 hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: 'Last 7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Custom range', value: 'custom', ms: 0 },
];

interface MetricDataPoint {
  timestamp: string;
  value: number;
  tenantId?: string;
  clusterName?: string;
}

interface Tenant {
  uuid: string;
  name: string;
  tier: string;
  namespace: string;
  email: string;
}

export default function MonitoringDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [requestsByTenant, setRequestsByTenant] = useState<any[]>([]);
  const [errorsByTenant, setErrorsByTenant] = useState<any[]>([]);
  const [serviceHealth, setServiceHealth] = useState<any[]>([]);

  // Time range state
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    verifyAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin && tenant) {
      fetchMetrics();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, tenant, selectedTimeRange, customStartDate, customEndDate]);

  // Calculate time interval based on selection
  const getTimeInterval = () => {
    const now = new Date();

    if (selectedTimeRange === 'custom' && customStartDate && customEndDate) {
      return {
        startTime: customStartDate.toISOString(),
        endTime: customEndDate.toISOString(),
      };
    }

    const preset = TIME_RANGE_PRESETS.find(p => p.value === selectedTimeRange);
    const ms = preset?.ms || 60 * 60 * 1000; // Default to 1 hour

    return {
      startTime: new Date(now.getTime() - ms).toISOString(),
      endTime: now.toISOString(),
    };
  };

  const verifyAdminAccess = async () => {
    try {
      console.log('[Monitoring] Starting admin access verification...');

      const token = localStorage.getItem('access_token');
      console.log('[Monitoring] Token exists:', !!token);

      if (!token) {
        console.log('[Monitoring] No token found, redirecting to login');
        router.push('/login');
        return;
      }

      // Verify admin access by calling the server-side tenant endpoint
      // This endpoint checks: user.email === tenant.email (proper admin verification)
      console.log('[Monitoring] Fetching tenant data for admin verification...');
      const tenantResponse = await fetch('/api/tenants/current', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!tenantResponse.ok) {
        const errorData = await tenantResponse.json().catch(() => ({}));
        console.error('[Monitoring] Tenant fetch failed:', tenantResponse.status, errorData);

        if (tenantResponse.status === 401) {
          router.push('/login');
          return;
        }

        if (tenantResponse.status === 403) {
          setError('Access denied. Only tenant administrators can access the monitoring dashboard.');
          setLoading(false);
          return;
        }

        throw new Error(errorData.message || 'Failed to verify admin access');
      }

      const tenantData = await tenantResponse.json();
      console.log('[Monitoring] Tenant data received:', tenantData);

      // Decode JWT to get user email for verification
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      console.log('[Monitoring] User email from token:', payload.email);
      console.log('[Monitoring] Tenant admin email:', tenantData.email);

      // Verify user email matches tenant admin email
      if (payload.email !== tenantData.email) {
        console.error('[Monitoring] Access denied - user email does not match tenant admin email');
        setError('Access denied. Only the tenant administrator can access this dashboard.');
        setLoading(false);
        return;
      }

      console.log('[Monitoring] Admin access verified successfully (email match confirmed)');
      setTenant(tenantData);
      setIsAdmin(true);
      setLoading(false);
    } catch (err: any) {
      console.error('[Monitoring] Error verifying admin access:', err);
      console.error('[Monitoring] Error details:', err.message, err.stack);
      setError('Failed to verify access. Please log in again.');
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token || !tenant) return;

      const interval = getTimeInterval();
      const timeParams = `&startTime=${encodeURIComponent(interval.startTime)}&endTime=${encodeURIComponent(interval.endTime)}`;

      // Fetch requests by tenant (CPU Usage)
      const requestsResponse = await fetch(`/api/monitoring/metrics?preset=requests-by-tenant${timeParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRequestsByTenant(transformGCPData(requestsData.data, tenant.namespace));
      } else if (requestsResponse.status === 404) {
        // Metrics don't exist yet - this is expected for new deployments
        console.log('Metrics not found yet. Waiting for GKE to collect data...');
      }

      // Fetch errors by tenant (Memory Usage)
      const errorsResponse = await fetch(`/api/monitoring/metrics?preset=errors-by-tenant${timeParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (errorsResponse.ok) {
        const errorsData = await errorsResponse.json();
        setErrorsByTenant(transformGCPData(errorsData.data, tenant.namespace));
      } else if (errorsResponse.status === 404 || errorsResponse.status === 400) {
        console.log('Error metrics not found yet. Waiting for GKE to collect data...');
      }

      // Fetch service health (Network Traffic)
      const healthResponse = await fetch(`/api/monitoring/metrics?preset=service-health${timeParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setServiceHealth(transformGCPData(healthData.data, tenant.namespace));
      } else if (healthResponse.status === 404) {
        console.log('Health metrics not found yet. Waiting for GKE to collect data...');
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
    }
  };

  const transformGCPData = (timeSeries: any[], tenantNamespace: string): any[] => {
    if (!timeSeries || timeSeries.length === 0) return [];

    // Filter to only include metrics from the current tenant's namespace
    const filteredSeries = timeSeries.filter((series) => {
      const namespace = series.resource?.labels?.namespace;
      return namespace === tenantNamespace;
    });

    if (filteredSeries.length === 0) {
      console.log(`[Monitoring] No metrics found for namespace: ${tenantNamespace}`);
      return [];
    }

    // Transform GCP Cloud Monitoring format to recharts format
    // Use timestamp as key to properly sort data chronologically
    const dataByTime: Record<number, any> = {};

    filteredSeries.forEach((series) => {
      // Get namespace from resource labels
      const namespace = series.resource?.labels?.namespace || 'unknown';

      // Get more specific labels if available
      const pod = series.metric?.labels?.pod || series.metric?.labels?.instance || '';
      const node = series.metric?.labels?.node || '';

      // Create a meaningful label combining namespace and pod/node info
      let label = namespace;
      if (pod) {
        label = `${namespace}/${pod}`;
      } else if (node) {
        label = `${namespace}/${node}`;
      }

      series.points?.forEach((point: any) => {
        const timestamp = point.interval?.endTime || point.interval?.startTime;
        if (!timestamp) return;

        const timestampMs = new Date(timestamp).getTime();
        const value = point.value?.doubleValue || point.value?.int64Value || 0;

        if (!dataByTime[timestampMs]) {
          // Format time based on selected range for better readability
          const date = new Date(timestamp);
          const timeRange = getTimeInterval();
          const durationMs = new Date(timeRange.endTime).getTime() - new Date(timeRange.startTime).getTime();
          const durationHours = durationMs / (1000 * 60 * 60);

          // Show date for longer ranges, just time for shorter
          let timeLabel: string;
          if (durationHours > 24) {
            timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                       date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (durationHours > 6) {
            timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          }

          dataByTime[timestampMs] = { time: timeLabel, _timestamp: timestampMs };
        }

        dataByTime[timestampMs][label] = Number(value);
      });
    });

    // Sort by timestamp (ascending - oldest first) and return all data points
    const sortedData = Object.values(dataByTime)
      .sort((a, b) => a._timestamp - b._timestamp)
      .map(({ _timestamp, ...rest }) => rest); // Remove internal timestamp field

    return sortedData;
  };

  // Custom Tooltip Component for Charts
  const CustomTooltip = ({
    active,
    payload,
    label,
    unit,
    formatValue,
  }: TooltipProps<number, string> & { unit?: string; formatValue?: (value: number) => string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
          <p className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">{payload[0].payload.time}</p>
          {payload.map((entry: any, index: number) => {
            const displayValue = formatValue
              ? formatValue(Number(entry.value))
              : `${Number(entry.value).toFixed(4)}${unit ? ` ${unit}` : ''}`;
            return (
              <p key={index} style={{ color: entry.color }} className="text-xs">
                <span className="font-medium">{entry.name}:</span> {displayValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <ProgressSpinner />
          <p className="mt-4">Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Message severity="error" text={error} className="mb-4" />
        {!isAdmin && (
          <Message
            severity="warn"
            text="Only the tenant administrator (matching email) can access the monitoring dashboard."
            className="mb-4"
          />
        )}
        <Button
          label="Back to Home"
          icon="pi pi-home"
          onClick={() => router.push('/')}
          className="bg-blue-600 hover:bg-blue-700"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <i className="pi pi-chart-line mr-2 text-purple-600"></i>
            System Monitoring
          </h1>
          <p className="text-sm">
            {tenant ? `Real-time metrics for ${tenant.name} (namespace: ${tenant.namespace})` : 'Real-time metrics from GCP Cloud Monitoring'}
          </p>
          {lastRefresh && (
            <p className="text-xs opacity-60 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refresh: 30s
            </p>
          )}
        </div>
        <Button
          label="Back to Admin"
          icon="pi pi-arrow-left"
          onClick={() => router.push('/admin/tenant')}
          className="bg-blue-600 hover:bg-blue-700"
        />
      </div>

      {/* Time Range Selector */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <i className="pi pi-clock text-purple-600"></i>
            <span className="font-medium">Time Range:</span>
          </div>
          <Dropdown
            value={selectedTimeRange}
            options={TIME_RANGE_PRESETS}
            onChange={(e) => setSelectedTimeRange(e.value)}
            optionLabel="label"
            optionValue="value"
            className="w-48"
            placeholder="Select time range"
          />

          {selectedTimeRange === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">From:</span>
              <Calendar
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.value as Date)}
                showTime
                hourFormat="24"
                placeholder="Start date"
                className="w-48"
                maxDate={customEndDate || new Date()}
              />
              <span className="text-sm">To:</span>
              <Calendar
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.value as Date)}
                showTime
                hourFormat="24"
                placeholder="End date"
                className="w-48"
                minDate={customStartDate || undefined}
                maxDate={new Date()}
              />
            </div>
          )}

          <Button
            icon="pi pi-refresh"
            label="Refresh Now"
            onClick={fetchMetrics}
            className="bg-purple-600 hover:bg-purple-700 ml-auto"
            size="small"
          />
        </div>
      </Card>

      <Divider />

      {/* Charts */}
      <div className="space-y-6">
        {/* CPU Usage by Service */}
        <ChartCard
          title="CPU Usage by Service"
          subtitle="CPU seconds per second (rate) across microservices"
          description="Shows the rate of CPU time consumed by each container in your namespace. Higher values indicate more CPU-intensive workloads. Spikes may indicate processing bottlenecks or increased request load. Values are measured in CPU cores (1.0 = 1 full core)."
          metric="container_cpu_usage_seconds_total"
          interpretation={{
            low: '< 0.1 cores: Minimal CPU usage, services are idle or lightly loaded',
            medium: '0.1-0.5 cores: Normal operation under typical load',
            high: '> 0.5 cores: High CPU usage, consider scaling or optimization'
          }}
        >
          {requestsByTenant.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={requestsByTenant}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'CPU Cores', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip unit="cores" />} />
                <Legend />
                {Object.keys(requestsByTenant[0] || {})
                  .filter((key) => key !== 'time')
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="⏳ Waiting for metrics... GKE Managed Prometheus is collecting data. This takes 5-10 minutes after deployment." />
          )}
        </ChartCard>

        {/* Memory Usage by Service */}
        <ChartCard
          title="Memory Usage by Service"
          subtitle="Working set memory (bytes) across microservices"
          description="Displays the memory actively being used by each container, excluding cached data. This represents the minimum memory needed by the service. Sustained high memory usage may indicate memory leaks or the need for larger resource limits."
          metric="container_memory_working_set_bytes"
          interpretation={{
            low: '< 100 MB: Light memory footprint, typical for simple services',
            medium: '100-500 MB: Normal for Node.js/Java services with moderate data',
            high: '> 500 MB: High memory usage, monitor for leaks or increase limits'
          }}
        >
          {errorsByTenant.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={errorsByTenant}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis
                  label={{ value: 'Memory (bytes)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => formatBytes(value)}
                />
                <Tooltip content={<CustomTooltip unit="bytes" formatValue={formatBytes} />} />
                <Legend />
                {Object.keys(errorsByTenant[0] || {})
                  .filter((key) => key !== 'time')
                  .map((key, index) => (
                    <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
                  ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="⏳ Waiting for memory metrics... GKE Managed Prometheus is collecting Node.js metrics." />
          )}
        </ChartCard>

        {/* Network Traffic */}
        <ChartCard
          title="Network Traffic (Inbound)"
          subtitle="Network bytes received per second by service"
          description="Tracks incoming network traffic to each container. This includes API requests, database responses, and inter-service communication. Sudden increases may indicate traffic spikes or potential DDoS activity. Consistent patterns help establish baseline network usage."
          metric="container_network_receive_bytes_total"
          interpretation={{
            low: '< 1 KB/s: Minimal traffic, services are idle',
            medium: '1-100 KB/s: Normal API traffic patterns',
            high: '> 100 KB/s: High traffic, ensure sufficient bandwidth'
          }}
        >
          {serviceHealth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={serviceHealth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis
                  label={{ value: 'Bytes/sec', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => formatBytes(value) + '/s'}
                />
                <Tooltip content={<CustomTooltip unit="bytes/s" formatValue={(v) => formatBytes(v) + '/s'} />} />
                <Legend />
                {Object.keys(serviceHealth[0] || {})
                  .filter((key) => key !== 'time')
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="⏳ Waiting for network metrics... GKE is collecting traffic data." />
          )}
        </ChartCard>
      </div>

      {/* Setup Instructions (if no data) */}
      {requestsByTenant.length === 0 && errorsByTenant.length === 0 && serviceHealth.length === 0 && (
        <SetupInstructions />
      )}
    </div>
  );
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Chart Card Component with enhanced descriptions
function ChartCard({
  title,
  subtitle,
  description,
  metric,
  interpretation,
  children,
}: {
  title: string;
  subtitle: string;
  description?: string;
  metric?: string;
  interpretation?: {
    low: string;
    medium: string;
    high: string;
  };
  children: React.ReactNode;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="shadow-md">
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">{title}</h2>
            <p className="text-sm opacity-70">{subtitle}</p>
          </div>
          {(description || interpretation) && (
            <Button
              icon={showDetails ? 'pi pi-chevron-up' : 'pi pi-info-circle'}
              className="p-button-text p-button-sm"
              onClick={() => setShowDetails(!showDetails)}
              tooltip={showDetails ? 'Hide details' : 'Show metric details'}
              tooltipOptions={{ position: 'left' }}
            />
          )}
        </div>

        {showDetails && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            {description && (
              <p className="mb-3 text-gray-700 dark:text-gray-300">{description}</p>
            )}
            {metric && (
              <p className="mb-2 text-xs">
                <span className="font-medium">Prometheus metric:</span>{' '}
                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{metric}</code>
              </p>
            )}
            {interpretation && (
              <div className="space-y-1">
                <p className="font-medium text-xs mb-1">How to interpret:</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span>{interpretation.low}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span>{interpretation.medium}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span>{interpretation.high}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div>{children}</div>
    </Card>
  );
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center opacity-70">
        <i className="pi pi-chart-bar text-4xl mb-3"></i>
        <p>{message}</p>
      </div>
    </div>
  );
}

// Setup Instructions Component
function SetupInstructions() {
  return (
    <Card className="mt-6 bg-blue-50">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <i className="pi pi-info-circle mr-2 text-blue-600"></i>
        Setup GCP Cloud Monitoring
      </h3>
      <Message
        severity="info"
        text="To view multi-cluster metrics, configure GCP credentials:"
        className="mb-4"
      />
      <div className="space-y-3 text-sm">
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>
            Create a service account with <code className="bg-blue-100 px-2 py-1 rounded">roles/monitoring.viewer</code>
          </li>
          <li>
            Download JSON key and encode to base64:
            <pre className="bg-blue-100 p-2 rounded mt-1 text-xs overflow-x-auto">
              cat service-account.json | base64
            </pre>
          </li>
          <li>
            Add to <code className="bg-blue-100 px-2 py-1 rounded">.env</code>:
            <pre className="bg-blue-100 p-2 rounded mt-1 text-xs overflow-x-auto">
              GCP_PROJECT_ID=your-project-id{'\n'}
              GCP_MONITORING_CREDENTIALS_BASE64=&lt;base64-encoded-json&gt;
            </pre>
          </li>
          <li>Restart the frontend container</li>
        </ol>
        <Message
          severity="warn"
          text="Production: Use Workload Identity instead of service account keys"
          className="mt-4 text-xs"
        />
      </div>
    </Card>
  );
}
