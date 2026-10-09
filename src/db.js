const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL CHECK(length(name) BETWEEN 1 AND 255),
    description TEXT NOT NULL DEFAULT '',
    price DECIMAL(10,2) NOT NULL CHECK(price >= 0 AND price <= 99999999.99 AND abs(price * 100 - round(price * 100)) < 0.00001),
    quantity INTEGER NOT NULL CHECK(typeof(quantity) = 'integer' AND quantity >= 0 AND quantity <= 2147483647),
    created_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);
  return db;
}
module.exports = { openDatabase };
