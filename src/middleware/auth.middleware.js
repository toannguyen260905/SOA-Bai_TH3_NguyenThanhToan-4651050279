function createAuthMiddleware(config) {
  return async (req, res, next) => {
    const authorization = req.get('Authorization') || '';
    if (!/^Bearer [^\s]+$/i.test(authorization)) return res.status(401).json({ message: 'Thiếu hoặc sai định dạng Bearer token.' });
    try {
      const response = await fetch(`${config.authServiceUrl}/auth`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(config.authTimeoutMs), redirect: 'error',
      });
      if (response.status === 401 || response.status === 403) return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
      if (!response.ok) throw new Error('Auth service failed');
      const data = await response.json();
      if (!data.user || !Number.isSafeInteger(data.user.id) || data.user.id <= 0 || typeof data.user.userName !== 'string') throw new Error('Invalid auth response');
      req.user = data.user;
      next();
    } catch {
      res.status(503).json({ message: 'Dịch vụ xác thực tạm thời không khả dụng.' });
    }
  };
}
module.exports = { createAuthMiddleware };
