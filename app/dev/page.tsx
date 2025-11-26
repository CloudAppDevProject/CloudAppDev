'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DevPage() {
  const [statusUrl, setStatusUrl] = useState('/api/dev/social/newsletter/status');

  useEffect(() => {
    // In production, the status endpoint goes through the API Gateway proxy
    // In development, it uses the local proxy
    setStatusUrl('/api/dev/social/newsletter/status');
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div>
        <h1 style={{ marginBottom: '10px' }}>Developer Tools</h1>
        <p style={{ color: '#666', marginBottom: '40px' }}>
          Development and testing endpoints for CloudAppDev microservices
        </p>

        <div
          style={{
            backgroundColor: '#fff3cd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '40px',
            borderLeft: '4px solid #ff9800',
          }}
        >
          <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
            <strong>⚠️ Development Only:</strong> These endpoints are for testing and development.
            They should be removed or protected in production.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
          <div
            style={{
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
            }}
          >
            <h3 style={{ marginTop: 0 }}>📧 Newsletter Testing</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Manually trigger newsletter sends and test the newsletter system
            </p>
            <Link
              href="/dev/newsletter"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                backgroundColor: '#ff9800',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                marginTop: '10px',
              }}
            >
              Open Newsletter Tester
            </Link>
          </div>

          <div
            style={{
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
            }}
          >
            <h3 style={{ marginTop: 0 }}>📊 Service Status</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Check the status of the newsletter service and view statistics
            </p>
            <a
              href={statusUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                backgroundColor: '#2196f3',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                marginTop: '10px',
              }}
            >
              View Status
            </a>
          </div>
        </div>

        <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Quick Links</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>
            <Link href="/" style={{ color: '#ff9800' }}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/profile" style={{ color: '#ff9800' }}>
              User Profile
            </Link>
          </li>
          <li>
            <Link href="/newsletter/preferences/1" style={{ color: '#ff9800' }}>
              Newsletter Preferences (User 1)
            </Link>
          </li>
        </ul>

        <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>API Endpoints</h2>
        <div
          style={{
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            overflowX: 'auto',
          }}
        >
          <h4 style={{ marginTop: 0 }}>Frontend Proxy Endpoints</h4>
          <pre style={{ fontSize: '12px', lineHeight: '1.5', margin: '10px 0' }}>
{`POST /api/dev/newsletter/send
  Body: { "userId": 1 }
  Response: Newsletter send result

GET /api/dev/newsletter/send?userId=1
  Response: Newsletter send result`}
          </pre>

          <h4>Social Service Newsletter Endpoints</h4>
          <pre style={{ fontSize: '12px', lineHeight: '1.5', margin: '10px 0' }}>
{`POST /api/v1/social/newsletter/subscribe
  Body: { "userId": 1, "email": "user@example.com", "frequency": "weekly" }

GET /api/v1/social/newsletter/preferences/:userId
  Response: User's newsletter preferences

PATCH /api/v1/social/newsletter/preferences/:userId
  Body: { "frequency": "weekly", "isSubscribed": true }

DELETE /api/v1/social/newsletter/subscribe/:userId
  Response: Unsubscribe confirmation

POST /api/v1/social/newsletter/send-manual/:userId
  Response: Newsletter send result

GET /api/v1/social/newsletter/status
  Response: Service statistics and health

GET /api/v1/social/newsletter/trending
  Response: Current trending itineraries

GET /api/v1/social/newsletter/logs/:userId
  Response: User's delivery history`}
          </pre>
        </div>

        <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Environment Variables</h2>
        <div
          style={{
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            lineHeight: '1.5',
          }}
        >
          <div>
            <strong>API_GATEWAY_URL</strong>
            <br />
            Server-side environment variable used by all API proxy routes
            <br />
            <em style={{ color: '#666' }}>LOCAL DEV: http://localhost:8000</em>
            <br />
            <em style={{ color: '#666' }}>KUBERNETES: http://api-gateway:80</em>
          </div>
        </div>

        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            borderLeft: '4px solid #2196f3',
          }}
        >
          <h3 style={{ marginTop: 0 }}>💡 Tips</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1565c0' }}>
            <li>Subscribe users first before trying to send newsletters</li>
            <li>
              Use the newsletter preferences page to manage subscription frequency
            </li>
            <li>Check service status to verify connectivity with other services</li>
            <li>Monitor delivery logs to track newsletter sends</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
