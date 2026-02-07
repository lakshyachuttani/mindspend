/**
 * Express app: middleware, route mounting, global error handler.
 * Session-based auth; protected routes use requireAuth.
 */
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const { pool } = require('./db');
const { requireAuth } = require('./middleware/requireAuth');
const authRouter = require('./routes/auth');
const expensesRouter = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');
const summaryRouter = require('./routes/summary');

const app = express();

app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const sessionMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

app.use(
  session({
    store: new pgSession({ pool, tableName: 'session' }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionMaxAge,
    },
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRouter);
app.use('/api/expenses', requireAuth, expensesRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/summary', requireAuth, summaryRouter);

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
