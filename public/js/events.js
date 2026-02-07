/**
 * Event listeners and user interactions.
 * Calls API and state, then triggers re-renders via callbacks.
 */

import * as api from './api.js';
import * as state from './state.js';
import * as render from './render.js';

/**
 * Wire all UI events. Callbacks receive (state) and can call loaders/renders.
 * @param {ReturnType<state.createState>} appState
 * @param {{ loadCategories: () => Promise<void>, loadExpenses: () => Promise<void> }} loaders
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

  // Set default year/month to current
  const now = new Date();
  if (!summaryYear.value) summaryYear.value = now.getFullYear();
  summaryMonth.value = String(now.getMonth() + 1);

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
