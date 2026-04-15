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
        name: 'forgot-password',
        path: '/user/forgot-password',
        component: './user/forgot-password',
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
    path: '/project-management/statistics',
    component: './project-management/statistics',
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
    routes: [
      {
        path: '/xiaoke-management/config',
        component: './xiaoke-management/config',
      },
      {
        path: '/xiaoke-management/chat-history',
        component: './xiaoke-management/chat-history',
      },
    ],
  },
  {
    path: '/password-book',
    component: './password-book',
    hideInMenu: true,
  },
  {
    path: '/web-scraper',
    routes: [
      {
        path: '/web-scraper/tasks',
        component: './web-scraper',
      },
      {
        path: '/web-scraper/results',
        component: './web-scraper/results',
      },
      {
        path: '/web-scraper/logs',
        component: './web-scraper/scrape-logs',
      },
    ],
  },
  {
    path: '/workflow',
    routes: [
      {
        path: '/workflow/list',
        component: './workflow/list',
      },
      {
        path: '/workflow/forms',
        component: './workflow/forms',
      },
      {
        path: '/workflow/monitor',
        component: './workflow/monitor',
      },
      {
        path: '/workflow/knowledge-base',
        component: './workflow/knowledge-base',
      },
      {
        path: '/workflow/knowledge-base/documents/:knowledgeBaseId',
        component: './workflow/knowledge-base/documents',
      },
    ],
  },
  {
    path: '/document',
    routes: [
      {
        path: '/document/list',
        component: './document/list',
      },
      {
        path: '/document/create',
        component: './document/create',
      },
      {
        path: '/document/create-by-workflow',
        component: './document/create-by-workflow',
      },
      {
        path: '/document/approval',
        component: './document/approval',
      },
    ],
  },
  {
    path: '/visit-management',
    routes: [
      {
        path: '/visit-management/task',
        component: './park-management/visit-task',
      },
      {
        path: '/visit-management/assessment',
        component: './park-management/visit-assessment',
      },
      {
        path: '/visit-management/knowledge-base',
        component: './park-management/visit-knowledge-base',
      },
      {
        path: '/visit-management/statistics',
        component: './park-management/visit-statistics',
      },
    ],
  },
  {
    path: '/park-management',
    routes: [
      {
        path: '/park-management/asset',
        component: './park-management/asset',
      },
      {
        path: '/park-management/investment',
        component: './park-management/investment',
      },
      {
        path: '/park-management/tenant',
        component: './park-management/tenant',
      },
      {
        path: '/park-management/contract',
        component: './park-management/contract',
      },
      {
        path: '/park-management/enterprise-service',
        component: './park-management/enterprise-service',
      },
      {
        path: '/park-management/statistics',
        component: './park-management/statistics',
      },
    ],
  },
  {
    path: '/cloud-storage',
    routes: [
      {
        path: '/cloud-storage/files',
        component: './cloud-storage/files',
      },
      {
        path: '/cloud-storage/shared',
        component: './cloud-storage/shared',
      },
      {
        path: '/cloud-storage/recycle',
        component: './cloud-storage/recycle',
      },
      {
        path: '/cloud-storage/quota',
        component: './cloud-storage/quota',
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
