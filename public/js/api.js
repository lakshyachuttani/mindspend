/**
 * API module — all fetch calls, one function per endpoint.
 * Uses relative URLs; credentials: 'include' for session cookies (same-origin).
 */

const API_BASE = '';

const defaultFetchOpts = { credentials: 'include' };

async function handleResponse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * POST /api/expenses
 * @param {{ amount: number, category_id: number, description?: string, expense_date?: string }} body
 * @returns {Promise<{ id: number, category_id: number, amount: number, description: string|null, expense_date: string, created_at: string }>}
 */
export async function createExpense(body) {
  const res = await fetch(`${API_BASE}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...defaultFetchOpts,
  });
  return handleResponse(res);
}

/**
 * GET /api/expenses
 * @param {{ from_date?: string, to_date?: string, category_id?: number }} params
 * @returns {Promise<Array<{ id: number, category_id: number, category_name: string, amount: number, description: string|null, expense_date: string, created_at: string }>>}
 */
export async function getExpenses(params = {}) {
  const q = new URLSearchParams();
  if (params.from_date) q.set('from_date', params.from_date);
  if (params.to_date) q.set('to_date', params.to_date);
  if (params.category_id != null && params.category_id !== '') q.set('category_id', String(params.category_id));
  const query = q.toString();
  const url = `${API_BASE}/api/expenses${query ? `?${query}` : ''}`;
  const res = await fetch(url, defaultFetchOpts);
  return handleResponse(res);
}

/**
 * POST /api/categories
 * @param {{ name: string }} body
 * @returns {Promise<{ id: number, name: string, created_at: string }>}
 */
export async function createCategory(body) {
  const res = await fetch(`${API_BASE}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...defaultFetchOpts,
  });
  return handleResponse(res);
}

/**
 * GET /api/categories
 * @returns {Promise<Array<{ id: number, name: string, created_at: string }>>}
 */
export async function getCategories() {
  const res = await fetch(`${API_BASE}/api/categories`, defaultFetchOpts);
  return handleResponse(res);
}

/**
 * GET /api/summary/monthly?year=&month=
 * @param {{ year: number, month: number }} params
 * @returns {Promise<{ year: number, month: number, by_category: Array<{ category_id: number, category_name: string, total_spent: string }>, total_spent: number }>}
 */
export async function getMonthlySummary(params) {
  const q = new URLSearchParams({ year: String(params.year), month: String(params.month) });
  const res = await fetch(`${API_BASE}/api/summary/monthly?${q}`, defaultFetchOpts);
  return handleResponse(res);
}

// — Auth —
export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, defaultFetchOpts);
  return handleResponse(res);
}

export async function login(body) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...defaultFetchOpts,
  });
  return handleResponse(res);
}

export async function register(body) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...defaultFetchOpts,
  });
  return handleResponse(res);
}

export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    ...defaultFetchOpts,
  });
  return handleResponse(res);
}

// — Analytics / Dashboard —
export async function getDashboard(params) {
  const q = params?.year_month ? new URLSearchParams({ year_month: params.year_month }) : '';
  const res = await fetch(`${API_BASE}/api/analytics/dashboard${q ? `?${q}` : ''}`, defaultFetchOpts);
  return handleResponse(res);
}

export async function getNudges(check = false) {
  const res = await fetch(`${API_BASE}/api/nudges${check ? '?check=1' : ''}`, defaultFetchOpts);
  return handleResponse(res);
}

export async function dismissNudge(id) {
  const res = await fetch(`${API_BASE}/api/nudges/${id}/dismiss`, {
    method: 'POST',
    ...defaultFetchOpts,
  });
  return handleResponse(res);
}

export async function muteNudge(code, body) {
  const res = await fetch(`${API_BASE}/api/nudges/preferences/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...defaultFetchOpts,
  });
  return handleResponse(res);
}

export async function exportData(format = 'json') {
  const res = await fetch(`${API_BASE}/api/user/export?format=${format}`, defaultFetchOpts);
  if (!res.ok) throw new Error(res.statusText);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindspend-export.${format === 'csv' ? 'csv' : 'json'}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function deleteAccount() {
  const res = await fetch(`${API_BASE}/api/user/account`, {
    method: 'DELETE',
    ...defaultFetchOpts,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || res.statusText);
  }
  return res.json();
}
