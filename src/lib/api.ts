import { ProtectedDomain } from './supabase';

const BACKEND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ice-wall-backend`;
const LOGIN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ice-wall-login`;

let sessionId: string | null = null;

export function setSessionId(id: string | null) {
  sessionId = id;
  if (id) {
    localStorage.setItem('ice_wall_session_id', id);
  } else {
    localStorage.removeItem('ice_wall_session_id');
  }
}

export function getSessionId(): string | null {
  if (!sessionId) {
    sessionId = localStorage.getItem('ice_wall_session_id');
  }
  return sessionId;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const sid = getSessionId();
  if (sid) {
    headers['X-Session-Id'] = sid;
  }

  return headers;
}

export interface User {
  id: string;
  username: string;
  is_admin: boolean;
}

export interface LoginResponse {
  session_id: string;
  user: User;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Login failed');
  }

  // Map the response to the expected format
  const result: LoginResponse = {
    session_id: data.sessionId,
    user: {
      id: data.user.id,
      username: data.user.username,
      is_admin: data.user.role === 'admin',
    },
  };

  setSessionId(result.session_id);
  
  // Store user info in localStorage
  localStorage.setItem('ice_wall_user', JSON.stringify(result.user));
  
  return result;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
  } finally {
    setSessionId(null);
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${BACKEND_URL}/me`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  return data.user;
}

export interface BypassPackageResult {
  zipBuffer: ArrayBuffer;
  deploymentId: string;
  deploymentKey: string;
  deploymentHash: string;
  paramName: string;
  apiUrl: string;
}

export async function fetchDomains(): Promise<ProtectedDomain[]> {
  const response = await fetch(`${BACKEND_URL}/domains`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch domains');
  }

  const data = await response.json();
  return data.domains;
}

export async function createDomain(safeUrl: string, moneyUrl: string, sensitivityLevel: string = 'medium'): Promise<ProtectedDomain> {
  const response = await fetch(`${BACKEND_URL}/domains`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      safe_url: safeUrl,
      money_url: moneyUrl,
      sensitivity_level: sensitivityLevel,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create domain');
  }

  const data = await response.json();
  return data.domain;
}

export async function generateBypassPackage(domain: ProtectedDomain): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/generate-bypass`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        domain_id: domain.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Erro HTTP: ${response.status}`);
    }

    const data = await response.json();

    const content = `
# IceWall Protection Package
Deployment ID: ${data.deploymentId}
Parâmetro: ${data.paramName}
API URL: ${data.apiUrl}

## Arquivos Gerados

${Object.keys(data.files).map(name => `### ${name}\n\n\`\`\`\n${data.files[name]}\n\`\`\``).join('\n\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icewall-${data.deploymentId}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log('✅ Pacote gerado:', data.deploymentId);
    console.log('🔑 Parâmetro:', data.paramName);
    console.log('📊 API URL:', data.apiUrl);

    alert(`✅ Pacote gerado!\n\n📦 ID: ${data.deploymentId}\n🔑 Parâmetro: ${data.paramName}\n📊 API: ${data.apiUrl}\n\nArquivos salvos em icewall-${data.deploymentId}.md`);

    return;
  } catch (error) {
    console.error('Erro ao gerar pacote:', error);
    throw error;
  }
}

export async function fetchDeploymentLogs(apiUrl: string) {
  try {
    const response = await fetch(`${apiUrl}?action=stats`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    throw error;
  }
}

export async function fetchRecentLogs(apiUrl: string, limit: number = 50) {
  try {
    const response = await fetch(`${apiUrl}?action=recent&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar logs recentes:', error);
    throw error;
  }
}

export async function fetchBlockedIPs(apiUrl: string, limit: number = 100) {
  try {
    const response = await fetch(`${apiUrl}?action=blocked&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar IPs bloqueados:', error);
    throw error;
  }
}

export interface AdminUser {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const response = await fetch(`${BACKEND_URL}/admin/users`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  const data = await response.json();
  return data.users;
}

export async function createUser(username: string, password: string): Promise<AdminUser> {
  const response = await fetch(`${BACKEND_URL}/admin/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }

  const data = await response.json();
  return data.user;
}

export async function fetchLogs(domainId?: string, filter?: string, limit?: number): Promise<any[]> {
  const params = new URLSearchParams();
  if (domainId && domainId !== 'all') params.append('domain_id', domainId);
  if (filter && filter !== 'all') params.append('filter', filter);
  if (limit) params.append('limit', limit.toString());

  const url = `${BACKEND_URL}/logs${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch logs');
  }

  const data = await response.json();
  return data.logs;
}

export async function deleteDomain(domainId: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/domains/${domainId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete domain');
  }
}

export async function updateDomainStatus(domainId: string, isActive: boolean): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/domains/${domainId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update domain status');
  }
}

export interface DashboardStats {
  totalRequests: number;
  blockedRequests: number;
  detectionRate: number;
  activeDomains: number;
  requestsToday: number;
  blockedToday: number;
  totalLogs: number;
  totalUsers?: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${BACKEND_URL}/stats`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }

  const data = await response.json();
  return data.stats;
}

export interface DomainActivity {
  id: string;
  domain: string;
  lastActivity: string | null;
  requestsToday: number;
  blockedToday: number;
  trafficLevel: 'low' | 'medium' | 'high';
  hourlyActivity: number[];
}
