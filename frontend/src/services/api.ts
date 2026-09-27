export interface HealthResponse {
  status: string;
  service: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Calls backend GET /health endpoint
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend request failed with HTTP ${response.status}`);
  }
  return response.json();
}
