const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
function getConfig() {
  const port = Number(process.env.PORT || 3002);
  const authTimeoutMs = Number(process.env.AUTH_TIMEOUT_MS || 3000);
  const authUrl = new URL(process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3001');
  if (!['http:', 'https:'].includes(authUrl.protocol) || authUrl.username || authUrl.password || authUrl.search || authUrl.hash) throw new Error('AUTH_SERVICE_URL phải là URL HTTP(S) hợp lệ.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT không hợp lệ.');
  if (!Number.isInteger(authTimeoutMs) || authTimeoutMs < 1 || authTimeoutMs > 60000) throw new Error('AUTH_TIMEOUT_MS phải từ 1 đến 60000.');
  return { port, authServiceUrl: authUrl.href.replace(/\/$/, ''), authTimeoutMs, dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || 'data/lab3.sqlite') };
}
module.exports = { getConfig };
