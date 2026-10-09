const express = require('express');
const { createProductRepository } = require('./repositories/product.repository');
const { createProductController } = require('./controllers/product.controller');
const { createAuthMiddleware } = require('./middleware/auth.middleware');
const { createProductRouter } = require('./routes/product.routes');
function createApp(db, config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use('/products', createProductRouter(createProductController(createProductRepository(db)), createAuthMiddleware(config)));
  app.use((req, res) => res.status(404).json({ message: 'API không tồn tại.' }));
  app.use((error, req, res, next) => {
    if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ message: 'Nội dung yêu cầu không hợp lệ.' });
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  });
  return app;
}
module.exports = { createApp };
