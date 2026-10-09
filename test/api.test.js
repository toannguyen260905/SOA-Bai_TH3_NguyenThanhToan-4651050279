const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const path = require('node:path');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const lab2 = (file) => require(path.resolve(__dirname, '../../Lab-2', file));
async function start(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
async function stop(server) { if (server.listening) await new Promise(resolve => server.close(resolve)); }
test('Integration with actual Lab 2 authentication and product CRUD', async (t) => {
  const authDb = lab2('src/db').openDatabase(':memory:');
  authDb.prepare('INSERT INTO User (UserName, Password) VALUES (?, ?)').run('student', await lab2('node_modules/bcryptjs').hash('Student@123', 4));
  const config = { secret: 'test-secret-at-least-32-characters-long', expiresIn: '1h' };
  const auth = await start(lab2('src/app').createApp(authDb, config));
  const db = openDatabase(':memory:');
  const product = await start(createApp(db, { authServiceUrl: auth.url, authTimeoutMs: 1000 }));
  t.after(async () => { await stop(product.server); await stop(auth.server); db.close(); authDb.close(); });
  const login = await fetch(auth.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userName: 'student', password: Buffer.from('Student@123').toString('base64') }) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const call = (route, method = 'GET', body, bearer = token) => fetch(product.url + route, { method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  await t.test('Missing, forged and expired token', async () => {
    assert.equal((await call('/products', 'GET', undefined, '')).status, 401);
    assert.equal((await call('/products', 'GET', undefined, 'fake')).status, 401);
    const expired = lab2('node_modules/jsonwebtoken').sign({}, config.secret, { subject: '1', expiresIn: -1 });
    assert.equal((await call('/products', 'GET', undefined, expired)).status, 401);
  });
  await t.test('Full CRUD and missing records', async () => {
    const input = { name: 'Bàn phím', description: 'USB', price: 199000.50, quantity: 10 };
    const created = await call('/products', 'POST', input);
    assert.equal(created.status, 201);
    const row = await created.json();
    assert.equal(created.headers.get('location'), `/products/${row.id}`);
    assert.equal(row.price, input.price); assert.ok(row.created_at);
    assert.equal((await (await call('/products')).json()).length, 1);
    assert.equal((await (await call(`/products/${row.id}`)).json()).name, input.name);
    const updated = await call(`/products/${row.id}`, 'PUT', { ...input, price: 123.45, quantity: 0 });
    assert.equal(updated.status, 200);
    const changed = await updated.json();
    assert.equal(changed.quantity, 0); assert.equal(changed.price, 123.45); assert.equal(changed.created_at, row.created_at); assert.ok(changed.updated_at);
    assert.equal((await call(`/products/${row.id}`, 'DELETE')).status, 204);
    assert.equal((await call(`/products/${row.id}`)).status, 404);
    assert.equal((await call(`/products/${row.id}`, 'PUT', input)).status, 404);
    assert.equal((await call(`/products/${row.id}`, 'DELETE')).status, 404);
  });
  await t.test('Invalid input and malformed JSON', async () => {
    const input = { name: 'Test', price: 1, quantity: 1 };
    for (const patch of [{ name: '' }, { price: -1 }, { price: 1.234 }, { price: 100000000 }, { price: '10' }, { quantity: -1 }, { quantity: 1.5 }, { quantity: 2147483648 }, { description: null }]) assert.equal((await call('/products', 'POST', { ...input, ...patch })).status, 400);
    assert.equal((await call('/products', 'POST', [])).status, 400);
    assert.equal((await call('/products/abc')).status, 400);
    assert.equal((await call('/products/0')).status, 400);
    const malformed = await fetch(product.url + '/products', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await (await call('/products')).json(), []);
  });
  await t.test('Auth service unavailable blocks writes', async () => {
    await stop(auth.server);
    assert.equal((await call('/products', 'POST', { name: 'Blocked', price: 1, quantity: 1 })).status, 503);
    assert.equal(db.prepare('SELECT count(*) AS total FROM products').get().total, 0);
  });
});
