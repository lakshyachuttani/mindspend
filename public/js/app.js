/**
 * App entry: initialization and wiring.
 * Loads initial data, wires events, and keeps state/loaders in closure.
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

wireEvents(appState, { loadCategories, loadExpenses });

// Initial load
(async function init() {
  await loadCategories();
  await loadExpenses();
})();
