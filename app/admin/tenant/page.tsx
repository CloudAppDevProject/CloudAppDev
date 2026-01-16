'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { Avatar } from 'primereact/avatar';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';

interface Tenant {
  uuid: string;
  name: string;
  tier: string;
  namespace: string;
  email: string;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export default function TenantDashboardPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch current tenant info
      const tenantResponse = await fetch('/api/tenants/current', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!tenantResponse.ok) {
        throw new Error('Failed to fetch tenant data');
      }

      const tenantData = await tenantResponse.json();
      setTenant(tenantData);

      // Fetch users in tenant
      const usersResponse = await fetch('/api/tenants/current/users', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }

      const usersData = await usersResponse.json();
      setUsers(usersData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSettingsDialog = () => {
    if (tenant) {
      setEditedName(tenant.name);
      setShowSettingsDialog(true);
    }
  };

  const handleSaveSettings = async () => {
    if (!tenant) return;

    setSaving(true);
    const token = localStorage.getItem('access_token');

    try {
      const response = await fetch(`/api/tenants/${tenant.uuid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editedName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update organization settings');
      }

      await fetchTenantData();
      setShowSettingsDialog(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <ProgressSpinner />
          <p className="mt-4">Loading organization dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Message severity="error" text={error} className="mb-4" />
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
        <h1 className="text-3xl font-bold">
          <i className="pi pi-building mr-2 text-blue-600"></i>
          Organization Dashboard
        </h1>
        <Button
          label="Monitoring"
          icon="pi pi-chart-line"
          onClick={() => router.push('/admin/monitoring')}
          className="bg-purple-600 hover:bg-purple-700"
        />
      </div>

      <Divider />

      {/* Tenant Info Card */}
      {tenant && (
        <Card className="mb-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">{tenant.name}</h2>
            <Button
              label="Settings"
              icon="pi pi-cog"
              onClick={openSettingsDialog}
              className="p-button-outlined"
              size="small"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm opacity-70 mb-1">Tier</p>
              <Tag value={tenant.tier} severity="info" className="capitalize" />
            </div>
            <div>
              <p className="text-sm opacity-70 mb-1">Namespace</p>
              <p className="text-lg font-medium">{tenant.namespace}</p>
            </div>
            <div>
              <p className="text-sm opacity-70 mb-1">Users</p>
              <p className="text-lg font-medium">{users.length}</p>
            </div>
            <div>
              <p className="text-sm opacity-70 mb-1">Created</p>
              <p className="text-lg font-medium">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card className="shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Team Members</h2>
          <Button
            label="Add User"
            icon="pi pi-user-plus"
            onClick={() => router.push('/admin/invite')}
            className="bg-blue-600 hover:bg-blue-700"
          />
        </div>

        <DataTable
          value={users}
          stripedRows
          showGridlines
          emptyMessage="No team members found"
        >
          <Column
            field="name"
            header="User"
            body={(rowData: User) => (
              <div className="flex items-center">
                {rowData.avatarUrl ? (
                  <Avatar
                    image={rowData.avatarUrl}
                    shape="circle"
                    size="normal"
                    className="mr-2"
                  />
                ) : (
                  <Avatar
                    label={rowData.name.charAt(0).toUpperCase()}
                    shape="circle"
                    size="normal"
                    className="mr-2"
                    style={{ backgroundColor: '#9ca3af', color: '#fff' }}
                  />
                )}
                <span className="font-medium">{rowData.name}</span>
              </div>
            )}
          />
          <Column field="email" header="Email" />
          <Column
            field="createdAt"
            header="Joined"
            body={(rowData: User) =>
              new Date(rowData.createdAt).toLocaleDateString()
            }
          />
        </DataTable>
      </Card>

      {/* Settings Dialog */}
      <Dialog
        header="Organization Settings"
        visible={showSettingsDialog}
        style={{ width: '450px' }}
        onHide={() => setShowSettingsDialog(false)}
        footer={
          <div>
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => setShowSettingsDialog(false)}
              className="p-button-text"
              disabled={saving}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              onClick={handleSaveSettings}
              loading={saving}
              className="bg-blue-600 hover:bg-blue-700"
            />
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium mb-2">
              Organization Name
            </label>
            <InputText
              id="org-name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full"
              placeholder="Enter organization name"
            />
          </div>

          <Message
            severity="info"
            text="Changes will be applied immediately after saving."
            className="mt-4"
          />
        </div>
      </Dialog>
    </div>
  );
}
