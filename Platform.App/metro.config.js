const http = require('http');

const API_TARGET = 'http://localhost:15000';

function createApiProxy() {
  return (req, res, next) => {
    if (!req.url.startsWith('/api/')) {
      return next();
    }

    const options = {
      hostname: 'localhost',
      port: 15000,
      path: `/apiservice${req.url}`,
      method: req.method,
      headers: { ...req.headers },
    };
    delete options.headers.host;

    const proxyReq = http.request(options, (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 200;
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) {
          res.setHeader(key, Array.isArray(value) ? value : String(value));
        }
      }
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[api-proxy]', err.message);
      res.statusCode = 502;
      res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
  };
}

module.exports = {
  server: {
    enhanceMiddleware: (middleware) => {
      const apiProxy = createApiProxy();
      return (req, res, next) => {
        apiProxy(req, res, () => middleware(req, res, next));
      };
    },
  },
};
