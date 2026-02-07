/**
 * Frontend dev server: serves public/ on FRONTEND_PORT (default 5174),
 * proxies /api and /health to BACKEND_URL (default http://localhost:3000).
 * Run with: npm run frontend
 */
require('dotenv').config();
const path = require('path');
const express = require('express');

const app = express();
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || '5174', 10);
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

app.use(express.json());

function proxyToBackend(req, res) {
  const url = BACKEND_URL + req.originalUrl;
  const headers = { ...req.headers, host: new URL(BACKEND_URL).host };
  delete headers['content-length'];
  const opts = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
    opts.body = JSON.stringify(req.body);
    opts.headers['content-type'] = 'application/json';
  }
  fetch(url, opts)
    .then((proxyRes) => {
      res.status(proxyRes.status);
      proxyRes.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value);
      });
      return proxyRes.text();
    })
    .then((body) => res.send(body))
    .catch((err) => {
      console.error('Proxy error:', err);
      res.status(502).json({ error: 'Backend unreachable. Is the API running on ' + BACKEND_URL + '?' });
    });
}

app.use('/api', proxyToBackend);
app.get('/health', proxyToBackend);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(FRONTEND_PORT, () => {
  console.log(`MindSpend frontend: http://localhost:${FRONTEND_PORT} (API proxy → ${BACKEND_URL})`);
});
