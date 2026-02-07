/**
 * Express app: middleware, route mounting, global error handler.
 * No auth in MVP; extension point for future middleware.
 */
const express = require('express');
const expensesRouter = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');
const summaryRouter = require('./routes/summary');

const app = express();
const path = require('path');

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/summary', summaryRouter);

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
