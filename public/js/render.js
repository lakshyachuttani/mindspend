/**
 * DOM rendering only. No fetch, no business logic.
 * Receives data and container elements; updates the DOM.
 */

/**
 * @param {HTMLElement} listEl
 * @param {Array<{ id: number, name: string }>} categories
 */
export function renderCategoryList(listEl, categories) {
  listEl.innerHTML = '';
  categories.forEach((c) => {
    const li = document.createElement('li');
    li.textContent = c.name;
    li.dataset.id = String(c.id);
    listEl.appendChild(li);
  });
}

/**
 * Populate a <select> with category options (keeps first option as placeholder).
 * @param {HTMLSelectElement} selectEl
 * @param {Array<{ id: number, name: string }>} categories
 * @param {string} placeholderValue - value for the first option (e.g. '' or 'all')
 */
export function renderCategoryOptions(selectEl, categories, placeholderValue = '') {
  const firstOption = selectEl.options[0];
  const placeholderText = firstOption ? firstOption.textContent : '— Select —';
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = placeholderValue;
  placeholder.textContent = placeholderText;
  selectEl.appendChild(placeholder);
  categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = String(c.id);
    opt.textContent = c.name;
    selectEl.appendChild(opt);
  });
}

/**
 * @param {HTMLElement} listEl
 * @param {Array<{ id: number, amount: number, category_name: string, description: string|null, expense_date: string }>} expenses
 */
export function renderExpenseList(listEl, expenses) {
  listEl.innerHTML = '';
  expenses.forEach((e) => {
    const li = document.createElement('li');
    const amount = document.createElement('span');
    amount.className = 'amount';
    amount.textContent = formatAmount(e.amount);
    const meta = document.createElement('span');
    meta.className = 'meta';
    const parts = [e.category_name, e.expense_date];
    if (e.description) parts.push(e.description);
    meta.textContent = parts.join(' · ');
    li.appendChild(amount);
    li.appendChild(meta);
    listEl.appendChild(li);
  });
}

/**
 * @param {HTMLElement} container
 * @param {{ year: number, month: number, by_category: Array<{ category_name: string, total_spent: string }>, total_spent: number } | null} summary
 */
export function renderSummary(container, summary) {
  if (!summary) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Category</th><th>Spent</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  summary.by_category.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(row.category_name)}</td><td>${formatAmount(Number(row.total_spent))}</td>`;
    tbody.appendChild(tr);
  });
  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  totalRow.innerHTML = `<td>Total</td><td>${formatAmount(summary.total_spent)}</td>`;
  tbody.appendChild(totalRow);
  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);
}

/**
 * Show a message in an element. Adds .error or .success class if type is set.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {'error'|'success'|''} type
 */
export function showMessage(el, text, type = '') {
  el.textContent = text;
  el.hidden = !text;
  el.className = 'message' + (type ? ` ${type}` : '');
}

/**
 * Toggle loading indicator visibility.
 * @param {HTMLElement} el
 * @param {boolean} loading
 */
export function setLoading(el, loading) {
  el.hidden = !loading;
}

/**
 * Update header to show current user and logout, or hide when not authenticated.
 * @param {HTMLElement} headerEl
 * @param {{ id: number, email: string } | null} user
 * @param {{ onLogout: () => void }} opts
 */
export function renderHeaderAuth(headerEl, user, opts = {}) {
  headerEl.innerHTML = '';
  headerEl.hidden = !user;
  if (!user) return;
  const emailSpan = document.createElement('span');
  emailSpan.className = 'user-email';
  emailSpan.textContent = user.email;
  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.textContent = 'Log out';
  logoutBtn.addEventListener('click', () => opts.onLogout && opts.onLogout());
  headerEl.appendChild(emailSpan);
  headerEl.appendChild(logoutBtn);
}

/**
 * Show or hide the app content block (categories, expenses, summary).
 * @param {HTMLElement} appContentEl
 * @param {boolean} visible
 */
export function setAppContentVisible(appContentEl, visible) {
  appContentEl.hidden = !visible;
}

/**
 * Show or hide the auth section (login/register).
 * @param {HTMLElement} authSectionEl
 * @param {boolean} visible
 */
export function setAuthSectionVisible(authSectionEl, visible) {
  authSectionEl.hidden = !visible;
}

function formatAmount(n) {
  return typeof n === 'number' ? n.toFixed(2) : String(n);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
