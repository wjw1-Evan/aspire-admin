/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
export default {
  // 开发环境代理配置 - 指向Aspire网关
  dev: {
    // REST: localhost:8000/api/** -> http://localhost:15000/apiservice/api/**
    '/api/': {
      target: 'http://localhost:15000/apiservice',
      changeOrigin: true,
      ws: true,
      // SSE 支持：确保代理支持 Server-Sent Events
      onProxyReq: (proxyReq: any, req: any, res: any) => {
        // 对于 SSE 请求，确保设置正确的请求头
        if (req.url && req.url.includes('/api/chat/sse')) {
          proxyReq.setHeader('Accept', 'text/event-stream');
          proxyReq.setHeader('Cache-Control', 'no-cache');
          proxyReq.setHeader('Connection', 'keep-alive');
        }
      },
      onProxyRes: (proxyRes: any, req: any, res: any) => {
        // 对于 SSE 响应，确保设置正确的响应头
        if (req.url && req.url.includes('/api/chat/sse')) {
          proxyRes.headers['Content-Type'] = 'text/event-stream';
          proxyRes.headers['Cache-Control'] = 'no-cache';
          proxyRes.headers['Connection'] = 'keep-alive';
          proxyRes.headers['X-Accel-Buffering'] = 'no';
        }
      },
      // keep /api prefix; gateway maps /apiservice/api/* -> ApiService /api/*
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
};
