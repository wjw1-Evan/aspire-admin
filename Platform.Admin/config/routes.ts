/**
 * @name umi 的路由配置
 * @description v5.0: 最小化静态路由，业务菜单完全从数据库动态加载
 *
 * 只保留以下静态路由：
 * - 认证相关（登录、注册）
 * - 隐藏页面（个人中心、修改密码）
 * - 系统页面（404）
 *
 * 业务菜单（welcome、system/*）从数据库动态加载，通过 app.tsx 的 menuDataRender 渲染
 */
export default [
  // 认证相关页面（无需登录）
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
      {
        name: 'register',
        path: '/user/register',
        component: './user/register',
      },
      {
        name: 'register-result',
        path: '/user/register-result',
        component: './user/register-result',
      },
    ],
  },

  // 隐藏页面（不在菜单中显示，但需要路由）
  {
    name: 'change-password',
    path: '/user/change-password',
    component: './user/change-password',
    hideInMenu: true,
  },
  {
    name: 'account.center',
    path: '/account/center',
    component: './account/center',
    hideInMenu: true,
  },
  {
    name: 'company-search',
    path: '/company/search',
    component: './company/search',
    hideInMenu: true,
  },
  {
    name: 'my-join-requests',
    path: '/join-requests/my',
    component: './join-requests/my',
    hideInMenu: true,
  },
  {
    name: 'pending-join-requests',
    path: '/join-requests/pending',
    component: './join-requests/pending',
    hideInMenu: true,
  },

  // 业务页面路由（从数据库菜单生成，这里只定义路由映射）
  {
    path: '/welcome',
    component: './Welcome',
    hideInMenu: true, // 隐藏静态路由，使用数据库菜单
  },
  {
    path: '/system/user-management',
    component: './user-management',
    hideInMenu: true,
  },
  {
    path: '/system/role-management',
    component: './role-management',
    hideInMenu: true,
  },
  {
    path: '/system/user-log',
    component: './user-log',
    hideInMenu: true,
  },
  {
    path: '/system/company-settings',
    component: './company/settings',
    hideInMenu: true,
  },
  {
    path: '/system/company-management',
    component: './company/settings',
    hideInMenu: true,
  },


  // 默认重定向和404
  {
    path: '/',
    redirect: '/welcome',
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
