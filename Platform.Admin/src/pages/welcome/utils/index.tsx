import React from 'react';
import { AppstoreOutlined } from '@ant-design/icons';
import { CORE_ICON_MAP } from '@/utils/iconMap';

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜里好';
}

export function getIconComponent(iconName?: string): React.ReactNode {
  if (iconName) {
    const icon = CORE_ICON_MAP[iconName];
    if (icon) return icon;
    
    const toPascalCase = (name: string) =>
      name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    
    const baseName = toPascalCase(iconName);
    const suffixes = ['Outlined', 'Filled', 'TwoTone', ''];
    for (const suffix of suffixes) {
      const fullName = baseName.endsWith(suffix) && suffix !== '' ? baseName : baseName + suffix;
      const found = CORE_ICON_MAP[fullName];
      if (found) return found;
    }
  }
  return <AppstoreOutlined />;
}

export function getMenuColor(path?: string): string {
  if (!path) return '#1890ff';
  const colorMap: Record<string, string> = {
    '/document': '#1890ff',
    '/project-management': '#52c41a',
    '/iot-platform': '#722ed1',
    '/xiaoke-management': '#13c2c2',
    '/workflow': '#faad14',
    '/password-book': '#f5222d',
    '/cloud-disk': '#eb2f96',
    '/visit': '#fa8c16',
    '/park': '#52c41a',
    '/account': '#1890ff',
    '/system': '#722ed1',
  };
  for (const key of Object.keys(colorMap)) {
    if (path.startsWith(key)) {
      return colorMap[key];
    }
  }
  return '#1890ff';
}

export function flattenMenus(menus: any[]): any[] {
  const result: any[] = [];
  const flatten = (items: any[]) => {
    items.forEach(item => {
      if (item.path) {
        result.push(item);
      }
      if (item.routes || item.children) {
        flatten((item.routes || item.children) as any[]);
      }
    });
  };
  flatten(menus);
  return result;
}

export function getResourceColor(status: string): string {
  const colorMap: Record<string, string> = {
    healthy: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    offline: '#999',
  };
  return colorMap[status] || '#1890ff';
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function getActivityColor(action: string): string {
  const colorMap: Record<string, string> = {
    create: 'green',
    update: 'blue',
    delete: 'red',
    login: 'cyan',
    logout: 'default',
    approve: 'success',
    reject: 'error',
  };
  return colorMap[action] || 'default';
}

export function getActionText(action: string): string {
  const textMap: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    login: '登录',
    logout: '退出',
    approve: '批准',
    reject: '拒绝',
  };
  return textMap[action] || action;
}
