// API Configuration for Microservices
// All requests go through the API Gateway on port 8000
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8000';

export const API_SERVICES = {
  USER_SERVICE: `${API_GATEWAY_URL}/api/v1/users`,
  ITINERARY_SERVICE: `${API_GATEWAY_URL}/api/v1/itineraries`,
  SOCIAL_SERVICE: `${API_GATEWAY_URL}/api/v1/social`,
};

// Helper function for API requests with error handling
export async function fetchFromService(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request failed:', url, error);
    throw error;
  }
}
