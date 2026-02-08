/**
 * App entry: initialization and wiring.
 * Auth gate: getMe() then show main app or login/register.
 */

import * as api from './api.js';
import * as state from './state.js';
import * as render from './render.js';
import { wireEvents } from './events.js';

const appState = state.createState();

const categoryList = document.getElementById('category-list');
const expenseCategory = document.getElementById('expense-category');
const filterCategory = document.getElementById('filter-category');
const expenseList = document.getElementById('expense-list');
const expensesMessage = document.getElementById('expenses-message');
const expensesLoading = document.getElementById('expenses-loading');
const summaryContent = document.getElementById('summary-content');
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const authHeader = document.getElementById('auth-header');
const userEmail = document.getElementById('user-email');
const sectionNudges = document.getElementById('section-nudges');
const nudgesList = document.getElementById('nudges-list');
const dashboardMonth = document.getElementById('dashboard-month');

async function loadCategories() {
  try {
    const categories = await api.getCategories();
    state.setCategories(appState, categories);
    render.renderCategoryList(categoryList, appState.categories);
    render.renderCategoryOptions(expenseCategory, appState.categories, '');
    render.renderCategoryOptions(filterCategory, appState.categories, '');
  } catch (err) {
    render.showMessage(document.getElementById('category-message'), err.data?.error || err.message, 'error');
  }
}

async function loadExpenses() {
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
    render.showMessage(expensesMessage, err.data?.error || err.message, 'error');
  } finally {
    render.setLoading(expensesLoading, false);
  }
}

async function loadDashboard() {
  const year_month = dashboardMonth?.value || undefined;
  try {
    const data = await api.getDashboard(year_month ? { year_month } : undefined);
    state.setDashboard(appState, data);
    render.renderDashboard(data);
  } catch (err) {
    render.renderDashboard(null);
  }
}

async function loadNudges() {
  try {
    const { nudges } = await api.getNudges(true);
    state.setNudges(appState, nudges);
    if (sectionNudges) sectionNudges.hidden = nudges.length === 0;
    render.renderNudges(nudgesList, nudges || []);
  } catch (_) {
    if (sectionNudges) sectionNudges.hidden = true;
    render.renderNudges(nudgesList, []);
  }
}

wireEvents(appState, { loadCategories, loadExpenses, loadDashboard, loadNudges });

(async function init() {
  try {
    const { user } = await api.getMe();
    state.setUser(appState, user);
    if (authScreen) authScreen.hidden = true;
    if (mainApp) mainApp.hidden = false;
    if (authHeader) authHeader.hidden = false;
    if (userEmail) userEmail.textContent = user?.email || '';
    if (dashboardMonth && !dashboardMonth.value) {
      const now = new Date();
      dashboardMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    await loadCategories();
    await loadExpenses();
    await loadDashboard();
    await loadNudges();
  } catch (err) {
    if (authScreen) authScreen.hidden = false;
    if (mainApp) mainApp.hidden = true;
    if (authHeader) authHeader.hidden = true;
  }
})();
