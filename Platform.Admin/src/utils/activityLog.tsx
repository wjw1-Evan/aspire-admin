import { Badge } from 'antd';
import React from 'react';

export function getMethodColor(method?: string): string {
  const colors: Record<string, string> = {
    GET: 'blue',
    POST: 'green',
    PUT: 'orange',
    DELETE: 'red',
    PATCH: 'purple',
  };
  return colors[method?.toUpperCase() || ''] || 'default';
}

export function getStatusBadge(statusCode?: number) {
  if (statusCode === undefined || statusCode === null) return null;
  if (statusCode >= 200 && statusCode < 300) {
    return <Badge status="success" text={statusCode} />;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return <Badge status="warning" text={statusCode} />;
  }
  if (statusCode >= 500) {
    return <Badge status="error" text={statusCode} />;
  }
  return <Badge status="default" text={statusCode} />;
}

const actionColorMap: Record<string, string> = {
  login: 'green',
  logout: 'default',
  refresh_token: 'geekblue',
  register: 'blue',
  view_profile: 'lime',
  update_profile: 'purple',
  change_password: 'orange',
  view_activity_logs: 'cyan',
  activate_user: 'green',
  deactivate_user: 'volcano',
  bulk_action: 'magenta',
  update_user_role: 'gold',
  create_user: 'blue',
  view_users: 'cyan',
  view_statistics: 'purple',
  view_user: 'cyan',
  update_user: 'blue',
  delete_user: 'red',
  view_roles: 'cyan',
  create_role: 'blue',
  update_role: 'orange',
  delete_role: 'red',
  view_menus: 'cyan',
  create_menu: 'blue',
  update_menu: 'orange',
  delete_menu: 'red',
  view_notices: 'cyan',
  create_notice: 'blue',
  update_notice: 'orange',
  delete_notice: 'red',
  view_tags: 'cyan',
  create_tag: 'blue',
  update_tag: 'orange',
  delete_tag: 'red',
  view_rules: 'cyan',
  create_rule: 'blue',
  update_rule: 'orange',
  delete_rule: 'red',
  view_permissions: 'cyan',
  create_permission: 'blue',
  update_permission: 'orange',
  delete_permission: 'red',
  view_current_user: 'lime',
};

export function getActionTagColor(action: string): string {
  return actionColorMap[action.toLowerCase()] || 'default';
}

const actionTextMap: Record<string, string> = {
  login: '登录',
  logout: '登出',
  refresh_token: '刷新令牌',
  register: '注册',
  create: '创建',
  update: '更新',
  delete: '删除',
  view: '查看',
  export: '导出数据',
  import: '导入数据',
  view_profile: '查看个人信息',
  update_profile: '更新个人资料',
  change_password: '修改密码',
  view_activity_logs: '查看活动日志',
  activate_user: '启用用户',
  deactivate_user: '禁用用户',
  update_user_role: '分配角色',
  create_user: '创建用户',
  view_users: '查询用户',
  view_statistics: '查看统计',
  view_user: '查看用户详情',
  update_user: '完善用户信息',
  delete_user: '注销用户',
  view_current_user: '查询当前用户',
  view_roles: '查询角色',
  create_role: '创建角色',
  update_role: '修改角色',
  delete_role: '删除角色',
  view_menus: '查询菜单',
  create_menu: '添加菜单',
  update_menu: '配置菜单',
  delete_menu: '删除菜单',
  view_notices: '浏览通知',
  create_notice: '发布通知',
  update_notice: '修改通知',
  delete_notice: '撤回通知',
  view_rules: '查询规则',
  create_rule: '新建规则',
  update_rule: '调整规则',
  delete_rule: '移除规则',
  view_permissions: '查询权限',
  create_permission: '定义权限',
  update_permission: '配置权限',
  delete_permission: '注回权限',
  bulk_action: '执行批量操作',
};

export function getActionText(action: string): string {
  if (!action) return '-';
  const a = action.toLowerCase();
  if (actionTextMap[a]) return actionTextMap[a];
  if (a.startsWith('create_')) return `创建${actionTextMap[a.replace('create_', '')] || action.replace('create_', '')}`;
  if (a.startsWith('update_')) return `更新${actionTextMap[a.replace('update_', '')] || action.replace('update_', '')}`;
  if (a.startsWith('delete_')) return `删除${actionTextMap[a.replace('delete_', '')] || action.replace('delete_', '')}`;
  if (a.startsWith('view_')) return `查看${actionTextMap[a.replace('view_', '')] || action.replace('view_', '')}`;
  return action;
}
