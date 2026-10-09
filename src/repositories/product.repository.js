function createProductRepository(db) {
  const findById = (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return {
    findAll: () => db.prepare('SELECT * FROM products ORDER BY id').all(),
    findById,
    create(product) {
      const result = db.prepare('INSERT INTO products (name, description, price, quantity) VALUES (?, ?, ?, ?)').run(product.name, product.description, product.price, product.quantity);
      return findById(Number(result.lastInsertRowid));
    },
    update(id, product) {
      const result = db.prepare("UPDATE products SET name = ?, description = ?, price = ?, quantity = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(product.name, product.description, product.price, product.quantity, id);
      return result.changes ? findById(id) : null;
    },
    delete: (id) => db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0,
  };
}
module.exports = { createProductRepository };
