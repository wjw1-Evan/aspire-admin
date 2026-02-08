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
    path: '/user-log',
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
  {
    path: '/system/organization',
    component: './organization',
    hideInMenu: true,
  },
  {
    path: '/system/my-activity',
    component: './my-activity',
    hideInMenu: true,
  },
  {
    path: '/task-management',
    component: './task-management',
    hideInMenu: true,
  },
  {
    path: '/project-management/project',
    component: './project-management',
    hideInMenu: true,
  },
  {
    path: '/iot-platform',
    component: './iot-platform',
    hideInMenu: true,
  },
  {
    path: '/iot-platform/gateway-management',
    component: './iot-platform/gateway-management',
    hideInMenu: true,
  },
  {
    path: '/iot-platform/device-management',
    component: './iot-platform/device-management',
    hideInMenu: true,
  },
  {
    path: '/iot-platform/datapoint-management',
    component: './iot-platform/datapoint-management',
    hideInMenu: true,
  },
  {
    path: '/iot-platform/event-management',
    component: './iot-platform/event-management',
    hideInMenu: true,
  },
  {
    path: '/iot-platform/data-center',
    component: './iot-platform/data-center',
    hideInMenu: true,
  },
  {
    path: '/xiaoke-management',
    hideInMenu: true, // 使用数据库菜单
    routes: [
      {
        path: '/xiaoke-management/config',
        component: './xiaoke-management/config',
        hideInMenu: true, // 使用数据库菜单
      },
      {
        path: '/xiaoke-management/chat-history',
        component: './xiaoke-management/chat-history',
        hideInMenu: true, // 使用数据库菜单
      },
    ],
  },
  {
    path: '/password-book',
    component: './password-book',
    hideInMenu: true, // 使用数据库菜单
  },
  {
    path: '/workflow',
    hideInMenu: true, // 使用数据库菜单
    routes: [
      {
        path: '/workflow/list',
        component: './workflow/list',
        hideInMenu: true,
      },

      {
        path: '/workflow/forms',
        component: './workflow/forms',
        hideInMenu: true,
      },

      {
        path: '/workflow/monitor',
        component: './workflow/monitor',
        hideInMenu: true,
      },
    ],
  },
  {
    path: '/document',
    hideInMenu: true, // 使用数据库菜单
    routes: [
      {
        path: '/document/list',
        component: './document/list',
        hideInMenu: true,
      },
      {
        path: '/document/create',
        component: './document/create',
        hideInMenu: true,
      },
      {
        path: '/document/create-by-workflow',
        component: './document/create-by-workflow',
        hideInMenu: true,
      },
      {
        path: '/document/approval',
        component: './document/approval',
        hideInMenu: true,
      },
    ],
  },
  {
    path: '/visit-management',
    hideInMenu: true,
    routes: [
      {
        path: '/visit-management/task',
        component: './park-management/visit-task',
        hideInMenu: true,
      },
      {
        path: '/visit-management/assessment',
        component: './park-management/visit-assessment',
        hideInMenu: true,
      },
      {
        path: '/visit-management/knowledge-base',
        component: './park-management/visit-knowledge-base',
        hideInMenu: true,
      },
    ],
  },
  {
    path: '/park-management',
    hideInMenu: true, // 使用数据库菜单
    routes: [
      {
        path: '/park-management/asset',
        component: './park-management/asset',
        hideInMenu: true,
      },
      {
        path: '/park-management/investment',
        component: './park-management/investment',
        hideInMenu: true,
      },
      {
        path: '/park-management/tenant',
        component: './park-management/tenant',
        hideInMenu: true,
      },
      {
        path: '/park-management/contract',
        component: './park-management/contract',
        hideInMenu: true,
      },
      {
        path: '/park-management/enterprise-service',
        component: './park-management/enterprise-service',
        hideInMenu: true,
      },
      {
        path: '/park-management/statistics',
        component: './park-management/statistics',
        hideInMenu: true,
      },
    ],
  },
  {
    path: '/cloud-storage',
    hideInMenu: true, // 使用数据库菜单
    routes: [
      {
        path: '/cloud-storage/files',
        component: './cloud-storage/files',
        hideInMenu: true,
      },
      {
        path: '/cloud-storage/shared',
        component: './cloud-storage/shared',
        hideInMenu: true,
      },
      {
        path: '/cloud-storage/recycle',
        component: './cloud-storage/recycle',
        hideInMenu: true,
      },
      {
        path: '/cloud-storage/quota',
        component: './cloud-storage/quota',
        hideInMenu: true,
      },
    ],
  },
  // 公共分享访问页面（无需布局、无需登录）
  {
    path: '/share/:token',
    component: './share',
    layout: false,
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
