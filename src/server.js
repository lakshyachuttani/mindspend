/**
 * Entry point: load env, start Express. DB connection is lazy (first query).
 */
require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`MindSpend API listening on port ${PORT}`);
});
