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

function formatAmount(n) {
  return typeof n === 'number' ? n.toFixed(2) : String(n);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Dashboard: cards and category bar chart (vanilla; no chart lib).
 */
export function renderDashboard(data) {
  const cardIncome = document.getElementById('card-income');
  const cardExpense = document.getElementById('card-expense');
  const cardSavings = document.getElementById('card-savings');
  if (!data) {
    if (cardIncome) cardIncome.textContent = '—';
    if (cardExpense) cardExpense.textContent = '—';
    if (cardSavings) cardSavings.textContent = '—';
    return;
  }
  if (cardIncome) cardIncome.textContent = formatAmount(data.total_income);
  if (cardExpense) cardExpense.textContent = formatAmount(data.total_expense);
  if (cardSavings) {
    cardSavings.textContent = formatAmount(data.savings);
    cardSavings.style.color = data.savings >= 0 ? '' : 'var(--error)';
  }
  const categoryEl = document.getElementById('chart-category');
  if (categoryEl && data.by_category?.length) {
    const max = Math.max(...data.by_category.map((c) => c.total_spent), 1);
    categoryEl.innerHTML = '';
    const title = document.createElement('p');
    title.className = 'chart-bar-label';
    title.textContent = 'Spending by category';
    categoryEl.appendChild(title);
    data.by_category.forEach((c) => {
      const wrap = document.createElement('div');
      wrap.className = 'chart-bar-wrap';
      const label = document.createElement('span');
      label.className = 'chart-bar-label';
      label.textContent = `${c.category_name} (${formatAmount(c.total_spent)})`;
      wrap.appendChild(label);
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.width = `${(c.total_spent / max) * 100}%`;
      wrap.appendChild(bar);
      categoryEl.appendChild(wrap);
    });
  } else if (categoryEl) {
    categoryEl.innerHTML = '<p class="chart-bar-label">No spending data for this month.</p>';
  }
  const trendEl = document.getElementById('chart-trend');
  if (trendEl) {
    trendEl.innerHTML = '';
    if (data.trend != null) {
      const p = document.createElement('p');
      p.className = 'chart-bar-label';
      const delta = data.trend.delta;
      const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
      p.textContent = `vs previous month: ${dir} ${formatAmount(Math.abs(delta))}`;
      trendEl.appendChild(p);
    }
  }
}

/**
 * Nudges list: supportive tone; dismiss and mute actions.
 */
export function renderNudges(container, nudges) {
  if (!container) return;
  container.innerHTML = '';
  nudges.forEach((n) => {
    const div = document.createElement('div');
    div.className = `nudge-item ${n.severity}`;
    div.dataset.id = String(n.id);
    const msg = document.createElement('p');
    msg.className = 'nudge-message';
    msg.textContent = n.message;
    div.appendChild(msg);
    const actions = document.createElement('div');
    actions.className = 'nudge-actions';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.dataset.id = String(n.id);
    const mute = document.createElement('button');
    mute.type = 'button';
    mute.textContent = 'Mute this type';
    mute.dataset.code = n.nudge_code;
    actions.appendChild(dismiss);
    actions.appendChild(mute);
    div.appendChild(actions);
    container.appendChild(div);
  });
}
