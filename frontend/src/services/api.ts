export interface HealthResponse {
  status: string;
  service: string;
  database?: {
    connected: boolean;
    database_url_type: string;
  };
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Returns HTTP headers with Bearer authorization token
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('campusflow_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

/**
 * Fetches authenticated user's workflow requests
 */
export async function fetchAuthenticatedWorkflows(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/workflows`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch workflows: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches workflow details enforcing ownership check on backend
 */
export async function fetchWorkflowDetails(workflowId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch workflow #${workflowId}: HTTP ${response.status}`);
  }
  return response.json();
}
