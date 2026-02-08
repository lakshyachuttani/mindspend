/**
 * Event listeners and user interactions.
 * Calls API and state, then triggers re-renders via callbacks.
 */

import * as api from './api.js';
import * as state from './state.js';
import * as render from './render.js';

/**
 * Wire all UI events.
 * @param {ReturnType<state.createState>} appState
 * @param {{ loadCategories: () => Promise<void>, loadExpenses: () => Promise<void>, loadDashboard: () => Promise<void>, loadNudges: () => Promise<void> }} loaders
 */
export function wireEvents(appState, loaders) {
  const categoryName = document.getElementById('category-name');
  const btnAddCategory = document.getElementById('btn-add-category');
  const categoryMessage = document.getElementById('category-message');
  const categoryList = document.getElementById('category-list');

  const formExpense = document.getElementById('form-expense');
  const expenseCategory = document.getElementById('expense-category');
  const expenseMessage = document.getElementById('expense-message');

  const filterFrom = document.getElementById('filter-from');
  const filterTo = document.getElementById('filter-to');
  const filterCategory = document.getElementById('filter-category');
  const btnApplyFilters = document.getElementById('btn-apply-filters');
  const expensesMessage = document.getElementById('expenses-message');
  const expensesLoading = document.getElementById('expenses-loading');
  const expenseList = document.getElementById('expense-list');

  const summaryYear = document.getElementById('summary-year');
  const summaryMonth = document.getElementById('summary-month');
  const btnLoadSummary = document.getElementById('btn-load-summary');
  const summaryMessage = document.getElementById('summary-message');
  const summaryLoading = document.getElementById('summary-loading');
  const summaryContent = document.getElementById('summary-content');

  const authScreen = document.getElementById('auth-screen');
  const mainApp = document.getElementById('main-app');
  const authHeader = document.getElementById('auth-header');
  const userEmail = document.getElementById('user-email');
  const btnLogout = document.getElementById('btn-logout');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authMessage = document.getElementById('auth-message');
  const registerMessage = document.getElementById('register-message');
  const registerBox = document.getElementById('register-box');
  const btnShowRegister = document.getElementById('btn-show-register');
  const btnShowLogin = document.getElementById('btn-show-login');
  const dashboardMonth = document.getElementById('dashboard-month');
  const btnRefreshDashboard = document.getElementById('btn-refresh-dashboard');
  const nudgesList = document.getElementById('nudges-list');
  const sectionNudges = document.getElementById('section-nudges');

  // Set default year/month to current
  const now = new Date();
  if (!summaryYear.value) summaryYear.value = now.getFullYear();
  summaryMonth.value = String(now.getMonth() + 1);
  if (dashboardMonth && !dashboardMonth.value) {
    dashboardMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // — Auth —
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await api.logout();
        state.setUser(appState, null);
        if (authScreen) authScreen.hidden = false;
        if (mainApp) mainApp.hidden = true;
        if (authHeader) authHeader.hidden = true;
      } catch (_) {}
    });
  }
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnDeleteAccount = document.getElementById('btn-delete-account');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', async () => {
      try { await api.exportData('json'); } catch (e) { alert(e.message || 'Export failed'); }
    });
  }
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', async () => {
      try { await api.exportData('csv'); } catch (e) { alert(e.message || 'Export failed'); }
    });
  }
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener('click', async () => {
      if (!confirm('Permanently delete your account and all data? This cannot be undone.')) return;
      try {
        await api.deleteAccount();
        state.setUser(appState, null);
        if (authScreen) authScreen.hidden = false;
        if (mainApp) mainApp.hidden = true;
        if (authHeader) authHeader.hidden = true;
      } catch (e) {
        alert(e.message || 'Failed to delete account');
      }
    });
  }
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = formLogin.querySelector('#login-email')?.value?.trim();
      const password = formLogin.querySelector('#login-password')?.value;
      if (!email || !password) return;
      render.showMessage(authMessage, '');
      try {
        await api.login({ email, password });
        state.setUser(appState, { email });
        if (authScreen) authScreen.hidden = true;
        if (mainApp) mainApp.hidden = false;
        if (authHeader) authHeader.hidden = false;
        if (userEmail) userEmail.textContent = email;
        loaders.loadCategories?.();
        loaders.loadExpenses?.();
        loaders.loadDashboard?.();
        loaders.loadNudges?.();
      } catch (err) {
        render.showMessage(authMessage, err.data?.error || err.message, 'error');
      }
    });
  }
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = formRegister.querySelector('#register-email')?.value?.trim();
      const password = formRegister.querySelector('#register-password')?.value;
      if (!email || !password || password.length < 8) {
        render.showMessage(registerMessage, 'Password must be at least 8 characters.', 'error');
        return;
      }
      render.showMessage(registerMessage, '');
      try {
        await api.register({ email, password });
        state.setUser(appState, { email });
        if (authScreen) authScreen.hidden = true;
        if (mainApp) mainApp.hidden = false;
        if (authHeader) authHeader.hidden = false;
        if (userEmail) userEmail.textContent = email;
        loaders.loadCategories?.();
        loaders.loadExpenses?.();
        loaders.loadDashboard?.();
        loaders.loadNudges?.();
      } catch (err) {
        render.showMessage(registerMessage, err.data?.error || err.message, 'error');
      }
    });
  }
  const loginBox = document.getElementById('login-box');
  if (btnShowRegister) {
    btnShowRegister.addEventListener('click', () => {
      if (registerBox) registerBox.hidden = false;
      if (loginBox) loginBox.hidden = true;
      render.showMessage(authMessage, '');
    });
  }
  if (btnShowLogin) {
    btnShowLogin.addEventListener('click', () => {
      if (registerBox) registerBox.hidden = true;
      if (loginBox) loginBox.hidden = false;
      render.showMessage(registerMessage, '');
    });
  }

  // — Dashboard —
  if (btnRefreshDashboard && loaders.loadDashboard) {
    btnRefreshDashboard.addEventListener('click', () => loaders.loadDashboard());
  }

  // — Nudges —
  if (nudgesList) {
    nudgesList.addEventListener('click', async (e) => {
      const dismissBtn = e.target.closest('button[data-id]');
      const muteBtn = e.target.closest('button[data-code]');
      if (dismissBtn && loaders.loadNudges) {
        try {
          await api.dismissNudge(parseInt(dismissBtn.dataset.id, 10));
          loaders.loadNudges();
        } catch (_) {}
      }
      if (muteBtn && loaders.loadNudges) {
        try {
          const until = new Date();
          until.setDate(until.getDate() + 7);
          await api.muteNudge(muteBtn.dataset.code, { muted_until: until.toISOString() });
          loaders.loadNudges();
        } catch (_) {}
      }
    });
  }

  // — Categories —
  btnAddCategory.addEventListener('click', async () => {
    const name = categoryName?.value?.trim();
    if (!name) {
      render.showMessage(categoryMessage, 'Enter a category name.', 'error');
      return;
    }
    render.showMessage(categoryMessage, '');
    try {
      const category = await api.createCategory({ name });
      state.addCategory(appState, category);
      render.renderCategoryList(categoryList, appState.categories);
      render.renderCategoryOptions(expenseCategory, appState.categories, '');
      render.renderCategoryOptions(filterCategory, appState.categories, '');
      categoryName.value = '';
      render.showMessage(categoryMessage, 'Category added.', 'success');
    } catch (err) {
      render.showMessage(categoryMessage, err.data?.error || err.message, 'error');
    }
  });

  // — Expense form —
  formExpense.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(formExpense.amount.value);
    const category_id = parseInt(formExpense.category_id.value, 10);
    const description = formExpense.description?.value?.trim() || undefined;
    const expense_date = formExpense.expense_date?.value || undefined;
    if (Number.isNaN(amount) || !category_id) {
      render.showMessage(expenseMessage, 'Amount and category are required.', 'error');
      return;
    }
    render.showMessage(expenseMessage, '');
    try {
      const expense = await api.createExpense({ amount, category_id, description, expense_date });
      state.addExpense(appState, expense);
      render.renderExpenseList(expenseList, appState.expenses);
      formExpense.reset();
      render.showMessage(expenseMessage, 'Expense added.', 'success');
      loaders.loadNudges?.();
      loaders.loadDashboard?.();
    } catch (err) {
      render.showMessage(expenseMessage, err.data?.error || err.message, 'error');
    }
  });

  // — Filters —
  btnApplyFilters.addEventListener('click', () => loaders.loadExpenses());

  // — Monthly summary —
  btnLoadSummary.addEventListener('click', async () => {
    const year = parseInt(summaryYear.value, 10);
    const month = parseInt(summaryMonth.value, 10);
    if (Number.isNaN(year) || Number.isNaN(month)) {
      render.showMessage(summaryMessage, 'Select year and month.', 'error');
      return;
    }
    render.showMessage(summaryMessage, '');
    render.setLoading(summaryLoading, true);
    summaryContent.hidden = true;
    try {
      const summary = await api.getMonthlySummary({ year, month });
      state.setSummary(appState, summary);
      render.renderSummary(summaryContent, summary);
    } catch (err) {
      render.showMessage(summaryMessage, err.data?.error || err.message, 'error');
    } finally {
      render.setLoading(summaryLoading, false);
    }
  });
}
