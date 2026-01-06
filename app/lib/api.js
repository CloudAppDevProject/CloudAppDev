/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header from localStorage
 */
export async function apiFetch(url, options = {}) {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    console.warn('[apiFetch] Running in server context, no localStorage available');
    return fetch(url, options);
  }

  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log(`[apiFetch] ${options.method || 'GET'} ${url} - Token: Present (${token.substring(0, 20)}...)`);
  } else {
    console.warn(`[apiFetch] ${options.method || 'GET'} ${url} - Token: MISSING`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log(`[apiFetch] Response: ${response.status} ${response.statusText}`);

  return response;
}

/**
 * Authenticated fetch that automatically parses JSON
 * Throws on non-OK responses
 */
export async function apiRequest(url, options = {}) {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.message || error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
