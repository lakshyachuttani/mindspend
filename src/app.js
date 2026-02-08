/**
 * Express app: middleware, route mounting, global error handler.
 * Session-based auth: cookie-parser + loadSession for /api; protected routes use requireAuth.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { loadSession } = require('./middleware/auth');
const expensesRouter = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');
const summaryRouter = require('./routes/summary');
const authRouter = require('./routes/auth');
const incomeRouter = require('./routes/income');
const goalsRouter = require('./routes/goals');
const budgetsRouter = require('./routes/budgets');
const analyticsRouter = require('./routes/analytics');
const nudgesRouter = require('./routes/nudges');
const notificationsRouter = require('./routes/notifications');
const userRouter = require('./routes/user');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// Session loaded for all /api requests; protected routes use requireAuth
app.use('/api', loadSession);
app.use('/api/auth', authRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/income', incomeRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/nudges', nudgesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/user', userRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler: log and return 500 with message
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
