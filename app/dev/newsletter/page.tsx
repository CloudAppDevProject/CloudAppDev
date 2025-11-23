'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DevNewsletterPage() {
  const [userId, setUserId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/dev/newsletter/send?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send newsletter');
        setResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <div>
        <h1 style={{ marginBottom: '30px' }}>Developer: Newsletter Testing</h1>

        <div
          style={{
            backgroundColor: '#fff3cd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '30px',
            borderLeft: '4px solid #ff9800',
          }}
        >
          <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
            <strong>⚠️ Development Only:</strong> This endpoint manually triggers newsletter sends.
            Use for testing in development/staging environments only.
          </p>
        </div>

        <form onSubmit={handleSendNewsletter} style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              User ID
            </label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              placeholder="Enter user ID"
              min="1"
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              The user must be subscribed to the newsletter
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#ccc' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Sending...' : 'Send Newsletter'}
          </button>
        </form>

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
            <p style={{ margin: '0 0 10px 0', color: '#721c24', fontWeight: 'bold' }}>
              ❌ Error
            </p>
            <p style={{ margin: 0, color: '#721c24', fontSize: '14px' }}>{error}</p>
            {result && (
              <pre
                style={{
                  marginTop: '10px',
                  backgroundColor: '#fff',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  color: '#721c24',
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        )}

        {result && !error && (
          <div
            style={{
              backgroundColor: '#d4edda',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              borderLeft: '4px solid #28a745',
            }}
          >
            <p style={{ margin: '0 0 10px 0', color: '#155724', fontWeight: 'bold' }}>
              ✅ Success
            </p>
            <p style={{ margin: '0 0 10px 0', color: '#155724', fontSize: '14px' }}>
              {result.message}
            </p>
            {result.data && (
              <div>
                <p style={{ margin: '10px 0 5px 0', color: '#155724', fontWeight: 'bold', fontSize: '12px' }}>
                  Details:
                </p>
                <pre
                  style={{
                    backgroundColor: '#fff',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    color: '#155724',
                  }}
                >
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>Quick Links</h3>
          <ul style={{ marginBottom: '20px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>
              <Link href="/dev" style={{ color: '#ff9800' }}>
                Back to Developer Tools
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link href="/newsletter/preferences/1" style={{ color: '#ff9800' }}>
                View Newsletter Preferences (User 1)
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link href="/profile" style={{ color: '#ff9800' }}>
                User Profile
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <a
                href="http://localhost:8082/api/v1/social/newsletter/status"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ff9800' }}
              >
                Newsletter Service Status
              </a>
            </li>
          </ul>

          <h3 style={{ marginTop: '20px', fontSize: '16px' }}>API Endpoints</h3>
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              lineHeight: '1.5',
            }}
          >
{`GET  /api/dev/newsletter/send?userId=1
POST /api/dev/newsletter/send
  Body: { "userId": 1 }

# Direct Social Service Endpoints:
POST /api/v1/social/newsletter/subscribe
GET  /api/v1/social/newsletter/preferences/:userId
PATCH /api/v1/social/newsletter/preferences/:userId
DELETE /api/v1/social/newsletter/subscribe/:userId
GET  /api/v1/social/newsletter/status
GET  /api/v1/social/newsletter/trending`}
            </pre>
          </div>
        </div>
    </div>
  );
}
