function validateProduct(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { name, description = '', price, quantity } = body;
  if (typeof name !== 'string' || !name.trim() || [...name.trim()].length > 255 || typeof description !== 'string' ||
      typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 99999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001 ||
      !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) return null;
  return { name: name.trim(), description, price: Math.round(price * 100) / 100, quantity };
}
function createProductController(products) {
  return {
    list: (req, res) => res.json(products.findAll()),
    detail(req, res) {
      const product = products.findById(req.productId);
      return product ? res.json(product) : res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    },
    create(req, res) {
      const input = validateProduct(req.body);
      if (!input) return res.status(400).json({ message: 'name (1-255 ký tự), description (chuỗi), price (0-99999999.99, tối đa 2 số lẻ), quantity (số nguyên 0-2147483647) không hợp lệ.' });
      const product = products.create(input);
      res.location(`/products/${product.id}`).status(201).json(product);
    },
    update(req, res) {
      const input = validateProduct(req.body);
      if (!input) return res.status(400).json({ message: 'Cần gửi đầy đủ name, price, quantity hợp lệ; description mặc định là chuỗi rỗng.' });
      const product = products.update(req.productId, input);
      return product ? res.json(product) : res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    },
    delete(req, res) {
      return products.delete(req.productId) ? res.status(204).end() : res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    },
  };
}
module.exports = { createProductController };
