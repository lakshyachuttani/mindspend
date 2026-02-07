/**
 * Event listeners and user interactions.
 * Calls API and state, then triggers re-renders via callbacks.
 * Auth events and 401 handling delegate to authCallbacks.
 */

import * as api from './api.js';
import * as state from './state.js';
import * as render from './render.js';

/**
 * Wire all UI events.
 * @param {ReturnType<state.createState>} appState
 * @param {{ loadCategories: () => Promise<void>, loadExpenses: () => Promise<void> }} loaders
 * @param {{ setUser: (user) => void, setAuthChecked: (boolean) => void, updateUIForAuth: () => void, onSessionExpired: () => void, showAuthMessage: (text: string, type: string) => void }} authCallbacks
 */
export function wireEvents(appState, loaders, authCallbacks = {}) {
  const {
    setUser,
    setAuthChecked,
    updateUIForAuth,
    onSessionExpired,
    showAuthMessage,
  } = authCallbacks;

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const btnShowRegister = document.getElementById('btn-show-register');
  const btnShowLogin = document.getElementById('btn-show-login');

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

  // Set default year/month to current
  const now = new Date();
  if (summaryYear && !summaryYear.value) summaryYear.value = now.getFullYear();
  if (summaryMonth) summaryMonth.value = String(now.getMonth() + 1);

  // — Auth: login —
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = formLogin.email?.value?.trim();
      const password = formLogin.password?.value;
      if (!email || !password) {
        showAuthMessage('Email and password are required.', 'error');
        return;
      }
      showAuthMessage('');
      try {
        const user = await api.login({ email, password });
        setUser(user);
        setAuthChecked(true);
        updateUIForAuth();
      } catch (err) {
        showAuthMessage(err.data?.error || err.message, 'error');
      }
    });
  }

  // — Auth: register (then auto-login) —
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = formRegister.email?.value?.trim();
      const password = formRegister.password?.value;
      if (!email || !password) {
        showAuthMessage('Email and password are required.', 'error');
        return;
      }
      if (password.length < 8) {
        showAuthMessage('Password must be at least 8 characters.', 'error');
        return;
      }
      showAuthMessage('');
      try {
        await api.register({ email, password });
        const user = await api.login({ email, password });
        setUser(user);
        setAuthChecked(true);
        updateUIForAuth();
      } catch (err) {
        showAuthMessage(err.data?.error || err.message, 'error');
      }
    });
  }

  // — Auth: toggle login / register forms —
  if (btnShowRegister) {
    btnShowRegister.addEventListener('click', () => {
      formLogin?.setAttribute('hidden', '');
      formRegister?.removeAttribute('hidden');
      btnShowRegister.hidden = true;
      if (btnShowLogin) btnShowLogin.hidden = false;
      showAuthMessage('');
    });
  }
  if (btnShowLogin) {
    btnShowLogin.addEventListener('click', () => {
      formRegister?.setAttribute('hidden', '');
      formLogin?.removeAttribute('hidden');
      btnShowLogin.hidden = true;
      if (btnShowRegister) btnShowRegister.hidden = false;
      showAuthMessage('');
    });
  }

  // — Categories (only when authenticated; 401 → session expired) —
  if (btnAddCategory) {
    btnAddCategory.addEventListener('click', async () => {
      if (!appState.user) return;
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
        if (err.unauthorized) onSessionExpired();
        else render.showMessage(categoryMessage, err.data?.error || err.message, 'error');
      }
    });
  }

  // — Expense form —
  if (formExpense) {
    formExpense.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!appState.user) return;
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
      } catch (err) {
        if (err.unauthorized) onSessionExpired();
        else render.showMessage(expenseMessage, err.data?.error || err.message, 'error');
      }
    });
  }

  // — Filters —
  if (btnApplyFilters) {
    btnApplyFilters.addEventListener('click', () => loaders.loadExpenses());
  }

  // — Monthly summary —
  if (btnLoadSummary) {
    btnLoadSummary.addEventListener('click', async () => {
      if (!appState.user) return;
      const year = parseInt(summaryYear?.value, 10);
      const month = parseInt(summaryMonth?.value, 10);
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
        if (err.unauthorized) onSessionExpired();
        else render.showMessage(summaryMessage, err.data?.error || err.message, 'error');
      } finally {
        render.setLoading(summaryLoading, false);
      }
    });
  }
}
