/**
 * App entry: initialization and wiring.
 * Checks session on load; loads data and wires events only when authenticated.
 */

import * as api from './api.js';
import * as state from './state.js';
import * as render from './render.js';
import { wireEvents } from './events.js';

const appState = state.createState();

const headerAuth = document.getElementById('header-auth');
const authSection = document.getElementById('auth-section');
const authMessage = document.getElementById('auth-message');
const authForms = document.getElementById('auth-forms');
const appContent = document.getElementById('app-content');

const categoryList = document.getElementById('category-list');
const expenseCategory = document.getElementById('expense-category');
const filterCategory = document.getElementById('filter-category');
const expenseList = document.getElementById('expense-list');
const expensesMessage = document.getElementById('expenses-message');
const expensesLoading = document.getElementById('expenses-loading');
const summaryContent = document.getElementById('summary-content');

async function loadCategories() {
  if (!appState.user) return;
  try {
    const categories = await api.getCategories();
    state.setCategories(appState, categories);
    render.renderCategoryList(categoryList, appState.categories);
    render.renderCategoryOptions(expenseCategory, appState.categories, '');
    render.renderCategoryOptions(filterCategory, appState.categories, '');
  } catch (err) {
    if (err.unauthorized) {
      onSessionExpired();
      return;
    }
    render.showMessage(document.getElementById('category-message'), err.data?.error || err.message, 'error');
  }
}

async function loadExpenses() {
  if (!appState.user) return;
  const from_date = document.getElementById('filter-from')?.value || undefined;
  const to_date = document.getElementById('filter-to')?.value || undefined;
  const category_id = document.getElementById('filter-category')?.value;
  const params = { from_date, to_date };
  if (category_id) params.category_id = parseInt(category_id, 10);

  render.showMessage(expensesMessage, '');
  render.setLoading(expensesLoading, true);
  try {
    const expenses = await api.getExpenses(params);
    state.setExpenses(appState, expenses);
    render.renderExpenseList(expenseList, expenses);
  } catch (err) {
    if (err.unauthorized) {
      onSessionExpired();
      return;
    }
    render.showMessage(expensesMessage, err.data?.error || err.message, 'error');
  } finally {
    render.setLoading(expensesLoading, false);
  }
}

function updateUIForAuth() {
  const user = appState.user;
  const checked = appState.authChecked;
  if (!checked) {
    authSection.hidden = false;
    if (authForms) authForms.hidden = true;
    appContent.hidden = true;
    render.showMessage(authMessage, 'Checking session…', '');
    headerAuth.hidden = true;
    return;
  }
  if (authForms) authForms.hidden = false;
  if (user) {
    render.setAuthSectionVisible(authSection, false);
    render.setAppContentVisible(appContent, true);
    render.showMessage(authMessage, '');
    render.renderHeaderAuth(headerAuth, user, { onLogout: handleLogout });
    loadCategories();
    loadExpenses();
  } else {
    render.setAuthSectionVisible(authSection, true);
    render.setAppContentVisible(appContent, false);
    render.showMessage(authMessage, 'Please log in to continue.', '');
    headerAuth.hidden = true;
  }
}

function onSessionExpired() {
  state.setUser(appState, null);
  state.setAuthChecked(appState, true);
  updateUIForAuth();
  render.showMessage(authMessage, 'Session expired. Please log in again.', 'error');
}

async function handleLogout() {
  try {
    await api.logout();
  } catch (_) {}
  state.setUser(appState, null);
  state.setAuthChecked(appState, true);
  updateUIForAuth();
}

const authCallbacks = {
  setUser: (user) => state.setUser(appState, user),
  setAuthChecked: (value) => state.setAuthChecked(appState, value),
  updateUIForAuth,
  onSessionExpired,
  showAuthMessage: (text, type) => render.showMessage(authMessage, text, type),
};

wireEvents(appState, { loadCategories, loadExpenses }, authCallbacks);

(async function init() {
  updateUIForAuth();
  try {
    const user = await api.getMe();
    state.setUser(appState, user);
    state.setAuthChecked(appState, true);
  } catch (err) {
    state.setUser(appState, null);
    state.setAuthChecked(appState, true);
  }
  updateUIForAuth();
})();
