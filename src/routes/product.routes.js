const { Router } = require('express');
function createProductRouter(controller, authenticate) {
  const router = Router();
  router.use(authenticate);
  router.param('id', (req, res, next, value) => {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return res.status(400).json({ message: 'ID phải là số nguyên dương hợp lệ.' });
    req.productId = Number(value);
    next();
  });
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);
  return router;
}
module.exports = { createProductRouter };
