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
      // keep /api prefix; gateway maps /apiservice/api/* -> ApiService /api/*
    },
    // SignalR hubs: localhost:8000/hubs/** -> http://localhost:15000/apiservice/hubs/**
    '/hubs/': {
      target: 'http://localhost:15000/apiservice',
      changeOrigin: true,
      ws: true,
      },
    // Also match '/hubs' (without trailing slash)
    '/hubs': {
      target: 'http://localhost:15000/apiservice',
      changeOrigin: true,
      ws: true,
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
