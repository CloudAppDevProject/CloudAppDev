'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

export default function InviteUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to invite user');
      }

      setSuccess(true);
      setFormData({ email: '', name: '' });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/admin/tenant');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <div className="flex items-center mb-6">
        <Button
          icon="pi pi-arrow-left"
          onClick={() => router.push('/admin/tenant')}
          text
          className="mr-3"
          tooltip="Back to Dashboard"
        />
        <h1 className="text-3xl font-bold">
          <i className="pi pi-user-plus mr-2 text-blue-600"></i>
          Invite User
        </h1>
      </div>

      {error && (
        <Message severity="error" text={error} className="mb-4" />
      )}

      {success && (
        <Message
          severity="success"
          text="User invited successfully! Redirecting..."
          className="mb-4"
        />
      )}

      <Card className="shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="field">
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <InputText
              id="name"
              type="text"
              required
              className="w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter user's full name"
            />
          </div>

          <div className="field">
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <InputText
              id="email"
              type="email"
              required
              className="w-full"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              label="Cancel"
              icon="pi pi-times"
              onClick={() => router.push('/admin/tenant')}
              severity="secondary"
              outlined
            />
            <Button
              type="submit"
              label={loading ? 'Inviting...' : 'Invite User'}
              icon={loading ? 'pi pi-spinner pi-spin' : 'pi pi-check'}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            />
          </div>
        </form>
      </Card>
    </div>
  );
}
