// API Configuration for Microservices
export const API_SERVICES = {
  USER_SERVICE: process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:8080/api/v1',
  ITINERARY_SERVICE: process.env.NEXT_PUBLIC_ITINERARY_SERVICE_URL || 'http://localhost:8081/api/v1',
  SOCIAL_SERVICE: process.env.NEXT_PUBLIC_SOCIAL_SERVICE_URL || 'http://localhost:8082/api/v1',
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
