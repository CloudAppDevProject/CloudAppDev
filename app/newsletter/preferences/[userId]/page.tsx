'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface Preferences {
  userId: number;
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isSubscribed: boolean;
}

export default function NewsletterPreferencesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = use(params);
  const userId = parseInt(userIdStr, 10);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local state for form
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isSubscribed, setIsSubscribed] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch preferences from Social Service via Next.js API proxy
      const prefsResponse = await fetch(
        `/api/newsletter/preferences/${userId}`
      );
      const prefsData = await prefsResponse.json();

      if (!prefsResponse.ok) {
        setError(prefsData.message || 'Failed to load preferences');
        return;
      }

      setPreferences(prefsData.data);
      setFrequency(prefsData.data.frequency || 'weekly');
      setIsSubscribed(prefsData.data.isSubscribed ?? true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/newsletter/preferences/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frequency,
            isSubscribed,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to save preferences');
        return;
      }

      setPreferences(data.data);
      setSuccess('Preferences saved successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Are you sure you want to unsubscribe from the newsletter?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/newsletter/subscribe/${userId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to unsubscribe');
        setSaving(false);
        return;
      }

      setSuccess('You have been unsubscribed from the newsletter.');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666' }}>Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }}>
      <div>
        <h1 style={{ marginBottom: '10px' }}>Newsletter Preferences</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Manage your email subscription settings
        </p>

        {error && (
          <div
            style={{
              backgroundColor: '#f8d7da',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              borderLeft: '4px solid #dc3545',
            }}
          >
            <p style={{ margin: 0, color: '#721c24', fontWeight: 'bold' }}>
              ❌ {error}
            </p>
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: '#d4edda',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              borderLeft: '4px solid #28a745',
            }}
          >
            <p style={{ margin: 0, color: '#155724', fontWeight: 'bold' }}>
              ✅ {success}
            </p>
          </div>
        )}

        {preferences && (
          <div
            style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px 0' }}>
              <strong>Email:</strong> {preferences.email}
            </p>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              <strong>Subscription Status:</strong>{' '}
              <span style={{ color: preferences.isSubscribed ? '#28a745' : '#dc3545' }}>
                {preferences.isSubscribed ? '✅ Subscribed' : '❌ Unsubscribed'}
              </span>
            </p>
          </div>
        )}

        <form onSubmit={handleSavePreferences} style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Subscription Status
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="isSubscribed"
                checked={isSubscribed}
                onChange={(e) => setIsSubscribed(e.target.checked)}
                style={{ marginRight: '10px', cursor: 'pointer', width: '18px', height: '18px' }}
              />
              <label htmlFor="isSubscribed" style={{ cursor: 'pointer', margin: 0 }}>
                I want to receive the weekly newsletter
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Newsletter Frequency
            </label>
            <div style={{ display: 'flex', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="frequency"
                  value="daily"
                  checked={frequency === 'daily'}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  style={{ marginRight: '8px', cursor: 'pointer', width: '18px', height: '18px' }}
                />
                Daily
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="frequency"
                  value="weekly"
                  checked={frequency === 'weekly'}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  style={{ marginRight: '8px', cursor: 'pointer', width: '18px', height: '18px' }}
                />
                Weekly
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="frequency"
                  value="monthly"
                  checked={frequency === 'monthly'}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  style={{ marginRight: '8px', cursor: 'pointer', width: '18px', height: '18px' }}
                />
                Monthly
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: saving ? '#ccc' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginBottom: '10px',
            }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>

        <button
          onClick={handleUnsubscribe}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: saving ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer',
            marginBottom: '20px',
          }}
        >
          {saving ? 'Processing...' : 'Unsubscribe from Newsletter'}
        </button>

        <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <Link href="/profile" style={{ color: '#ff9800', textDecoration: 'none' }}>
            Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
