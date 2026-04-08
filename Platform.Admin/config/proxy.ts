/**
 * 代理配置
 * @doc https://umijs.org/docs/guides/proxy
 */
export default {
  dev: {
    '/apiservice/': {
      target: 'http://localhost:15000',
      changeOrigin: true,
      ws: true,
    },
    '/systemmonitor/': {
      target: 'http://localhost:15000',
      changeOrigin: true,
      ws: true,
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
    },
  },
};