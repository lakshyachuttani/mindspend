/**
 * API module — all fetch calls, one function per endpoint.
 * Uses relative URLs and credentials: 'include' for session cookies (same-origin).
 */

const API_BASE = '';

const DEFAULT_FETCH_OPTS = { credentials: 'include' };

async function handleResponse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    if (res.status === 401) err.unauthorized = true;
    throw err;
  }
  return data;
}

// — Auth —

/**
 * POST /api/auth/register
 * @param {{ email: string, password: string }} body
 * @returns {Promise<{ id: number, email: string, created_at: string }>}
 */
export async function register(body) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return handleResponse(res);
}

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} body
 * @returns {Promise<{ id: number, email: string }>}
 */
export async function login(body) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return handleResponse(res);
}

/**
 * POST /api/auth/logout
 */
export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (res.status !== 204) await handleResponse(res);
}

/**
 * GET /api/auth/me — current user from session (401 if not authenticated)
 * @returns {Promise<{ id: number, email: string, created_at: string }>}
 */
export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  return handleResponse(res);
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
    ...DEFAULT_FETCH_OPTS,
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
  const res = await fetch(url, DEFAULT_FETCH_OPTS);
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
    ...DEFAULT_FETCH_OPTS,
  });
  return handleResponse(res);
}

/**
 * GET /api/categories
 * @returns {Promise<Array<{ id: number, name: string, created_at: string }>>}
 */
export async function getCategories() {
  const res = await fetch(`${API_BASE}/api/categories`, DEFAULT_FETCH_OPTS);
  return handleResponse(res);
}

/**
 * GET /api/summary/monthly?year=&month=
 * @param {{ year: number, month: number }} params
 * @returns {Promise<{ year: number, month: number, by_category: Array<{ category_id: number, category_name: string, total_spent: string }>, total_spent: number }>}
 */
export async function getMonthlySummary(params) {
  const q = new URLSearchParams({ year: String(params.year), month: String(params.month) });
  const res = await fetch(`${API_BASE}/api/summary/monthly?${q}`, DEFAULT_FETCH_OPTS);
  return handleResponse(res);
}
