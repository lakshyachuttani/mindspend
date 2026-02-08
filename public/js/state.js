/**
 * In-memory state. Single source of truth for data loaded from the API.
 * Auth state is inferred from API (no localStorage). No global variables.
 */

export function createState() {
  return {
    user: null,
    authChecked: false,
    categories: [],
    expenses: [],
    summary: null,
    dashboard: null,
    nudges: [],
  };
}

export function setUser(state, user) {
  state.user = user;
}

export function setAuthChecked(state, value) {
  state.authChecked = value;
}

export function setCategories(state, categories) {
  state.categories = categories;
}

export function setExpenses(state, expenses) {
  state.expenses = expenses;
}

export function setSummary(state, summary) {
  state.summary = summary;
}

export function addCategory(state, category) {
  state.categories = [...state.categories, category].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function addExpense(state, expense) {
  const category = state.categories.find((c) => c.id === expense.category_id);
  const enriched = { ...expense, category_name: category?.name ?? '—' };
  state.expenses = [enriched, ...state.expenses];
}

export function setDashboard(state, dashboard) {
  state.dashboard = dashboard;
}

export function setNudges(state, nudges) {
  state.nudges = nudges;
}
