'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
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
} from 'recharts';

interface MetricDataPoint {
  timestamp: string;
  value: number;
  tenantId?: string;
  clusterName?: string;
}

export default function MonitoringDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const [requestsByTenant, setRequestsByTenant] = useState<any[]>([]);
  const [errorsByTenant, setErrorsByTenant] = useState<any[]>([]);
  const [serviceHealth, setServiceHealth] = useState<any[]>([]);

  useEffect(() => {
    verifyAdminAccess();
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchMetrics();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

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

      // Decode JWT to check role
      const parts = token.split('.');
      console.log('[Monitoring] Token parts count:', parts.length);

      const payload = JSON.parse(atob(parts[1]));
      console.log('[Monitoring] Decoded JWT payload:', payload);
      console.log('[Monitoring] User role from token:', payload.role);
      console.log('[Monitoring] User ID from token:', payload.sub || payload.userId);
      console.log('[Monitoring] User email from token:', payload.email);

      setUserRole(payload.role);

      if (payload.role !== 'admin') {
        console.error('[Monitoring] Access denied - user role is:', payload.role, '(expected: admin)');
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      console.log('[Monitoring] Admin access verified successfully');
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
      if (!token) return;

      // Fetch requests by tenant
      const requestsResponse = await fetch('/api/monitoring/metrics?preset=requests-by-tenant', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRequestsByTenant(transformGCPData(requestsData.data));
      } else if (requestsResponse.status === 404) {
        // Metrics don't exist yet - this is expected for new deployments
        console.log('Metrics not found yet. Waiting for GKE to collect data...');
      }

      // Fetch errors by tenant
      const errorsResponse = await fetch('/api/monitoring/metrics?preset=errors-by-tenant', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (errorsResponse.ok) {
        const errorsData = await errorsResponse.json();
        setErrorsByTenant(transformGCPData(errorsData.data));
      } else if (errorsResponse.status === 404 || errorsResponse.status === 400) {
        console.log('Error metrics not found yet. Waiting for GKE to collect data...');
      }

      // Fetch service health
      const healthResponse = await fetch('/api/monitoring/metrics?preset=service-health', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setServiceHealth(transformGCPData(healthData.data));
      } else if (healthResponse.status === 404) {
        console.log('Health metrics not found yet. Waiting for GKE to collect data...');
      }
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
    }
  };

  const transformGCPData = (timeSeries: any[]): any[] => {
    if (!timeSeries || timeSeries.length === 0) return [];

    // Transform GCP Cloud Monitoring format to recharts format
    const dataByTime: Record<string, any> = {};

    timeSeries.forEach((series) => {
      const label =
        series.metric?.labels?.service ||
        series.metric?.labels?.job ||
        series.metric?.labels?.cluster_name ||
        series.metric?.labels?.tenant_id ||
        'unknown';

      series.points?.forEach((point: any) => {
        const timestamp = point.interval?.endTime || point.interval?.startTime;
        if (!timestamp) return;

        const time = new Date(timestamp).toLocaleTimeString();
        const value = point.value?.doubleValue || point.value?.int64Value || 0;

        if (!dataByTime[time]) {
          dataByTime[time] = { time };
        }

        dataByTime[time][label] = Number(value);
      });
    });

    return Object.values(dataByTime).slice(-20); // Last 20 data points
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
        {userRole !== 'admin' && (
          <Message
            severity="warn"
            text="Only administrators can access the monitoring dashboard."
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
            Real-time metrics from GCP Cloud Monitoring across all tenant clusters
          </p>
        </div>
        <Button
          label="Back to Admin"
          icon="pi pi-arrow-left"
          onClick={() => router.push('/admin/tenant')}
          className="bg-blue-600 hover:bg-blue-700"
        />
      </div>

      <Divider />

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Services"
          value="4"
          subtitle="User, Itinerary, Social, Tenant"
          icon="pi pi-server"
          color="blue"
        />
        <MetricCard
          title="Data Source"
          value="GCP"
          subtitle="Cloud Monitoring API"
          icon="pi pi-cloud"
          color="green"
        />
        <MetricCard
          title="Refresh Rate"
          value="30s"
          subtitle="Auto-refresh enabled"
          icon="pi pi-refresh"
          color="purple"
        />
        <MetricCard
          title="Multi-Cluster"
          value="All"
          subtitle="Centralized metrics"
          icon="pi pi-globe"
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="space-y-6">
        {/* CPU Usage by Service */}
        <ChartCard title="CPU Usage by Service" subtitle="CPU seconds per second (rate) across microservices">
          {requestsByTenant.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={requestsByTenant}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
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
        <ChartCard title="Memory Usage by Service" subtitle="Heap memory used (bytes) across microservices">
          {errorsByTenant.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={errorsByTenant}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
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

        {/* Service Health */}
        <ChartCard title="Service Health" subtitle="Service availability by cluster">
          {serviceHealth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={serviceHealth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} />
                <Tooltip />
                <Legend />
                {Object.keys(serviceHealth[0] || {})
                  .filter((key) => key !== 'time')
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="stepAfter"
                      dataKey={key}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="⏳ Waiting for health metrics... GKE is collecting service uptime data." />
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

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <Card className="shadow-md">
      <div className="flex items-center justify-between mb-3">
        <i className={`${icon} text-4xl ${colorClasses[color]}`}></i>
      </div>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs opacity-70">{subtitle}</p>
    </Card>
  );
}

// Chart Card Component
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-md">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm opacity-70">{subtitle}</p>
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
