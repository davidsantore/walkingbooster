import { API_URL, ANON_KEY } from './supabase';
function headers(adminToken?: string | null) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
     apikey: ANON_KEY,
  };

  if (adminToken) {
    h['Authorization'] = `Bearer ${adminToken}`;
  }

  return h;
}
async function req<T>(method: string, path: string, body?: unknown, adminToken?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: headers(adminToken),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.detail || 'Request failed');
  return data as T;
}

// Boost API
export const boostApi = {
  redeem: (key: string, invite: string) =>
    req<{ task_id: string; guild: { guild_id: string; guild_name: string; guild_icon: string } }>(
      'POST', '/boost-api/redeem', { key, invite }
    ),
  getTask: (taskId: string) =>
    req<{
      status: string;
      stats: Record<string, number>;
      tokens: Array<{ token_short: string; join_status: string; boost_status: string; slots_used: number }>;
      guild: { guild_id: string; guild_name: string; guild_icon: string };
    }>('GET', `/boost-api/task/${taskId}`),
};

// Admin API
export const adminApi = {
  login: (password: string) =>
    req<{ session_token: string }>('POST', '/admin-api/login', { password }),

  getStats: (token: string) =>
    req<Record<string, number>>('GET', '/admin-api/stats', undefined, token),

  getAccounts: (token: string) =>
    req<Account[]>('GET', '/admin-api/accounts', undefined, token),

  addAccount: (token: string, discordToken: string) =>
    req<Account>('POST', '/admin-api/accounts', { token: discordToken }, token),

  deleteAccount: (token: string, id: string) =>
    req<{ success: boolean }>('DELETE', `/admin-api/accounts/${id}`, undefined, token),

  refreshAccount: (token: string, id: string) =>
    req<Account>('POST', `/admin-api/accounts/${id}/refresh`, undefined, token),

  getKeys: (token: string) =>
    req<BoostKey[]>('GET', '/admin-api/keys', undefined, token),

  createKey: (token: string, boost_count: number, label: string) =>
    req<BoostKey>('POST', '/admin-api/keys', { boost_count, label }, token),

  deleteKey: (token: string, id: string) =>
    req<{ success: boolean }>('DELETE', `/admin-api/keys/${id}`, undefined, token),

  getTasks: (token: string) =>
    req<BoostTask[]>('GET', '/admin-api/tasks', undefined, token),
};

export interface Account {
  id: string;
  token_short: string;
  username: string;
  discriminator: string;
  avatar_url: string;
  nitro_slots: number;
  has_nitro: boolean;
  is_valid: boolean;
  created_at: string;
}

export interface BoostKey {
  id: string;
  key_value: string;
  label: string;
  boost_count: number;
  is_used: boolean;
  used_at: string | null;
  guild_id: string;
  guild_name: string;
  created_at: string;
}

export interface BoostTask {
  id: string;
  guild_id: string;
  guild_name: string;
  guild_icon: string;
  status: string;
  stats: Record<string, number>;
  created_at: string;
}
