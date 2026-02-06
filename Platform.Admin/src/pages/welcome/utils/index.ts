import React from 'react';
import * as AntdIcons from '@ant-design/icons';
import { useIntl } from '@umijs/max';

type IntlShape = ReturnType<typeof useIntl>;

// 根据图标名称获取图标组件
export const getIconComponent = (iconName?: string): React.ReactNode => {
    if (!iconName) return null;

    // 处理格式：Outlined, Filled, TwoTone
    let Component = (AntdIcons as any)[iconName];

    // 如果没有找到，尝试添加后缀
    if (!Component && !iconName.endsWith('Outlined') && !iconName.endsWith('Filled') && !iconName.endsWith('TwoTone')) {
        Component = (AntdIcons as any)[`${iconName}Outlined`];
    }

    // 如果还是没有，尝试处理可能的 kebab-case (e.g. user-add -> UserAddOutlined)
    if (!Component && iconName.includes('-')) {
        const pascalCase = iconName
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('');
        Component = (AntdIcons as any)[`${pascalCase}Outlined`];
    }

    return Component ? React.createElement(Component) : null;
};

// 根据路径获取菜单颜色
export const getMenuColor = (path: string): string => {
    if (path.startsWith('/system/user')) return '#1890ff';
    if (path.startsWith('/system/role')) return '#722ed1';
    if (path.startsWith('/system/menu')) return '#fa8c16';
    if (path.startsWith('/system/company')) return '#eb2f96'; // Magenta

    if (path.startsWith('/iot-platform/device')) return '#13c2c2'; // Cyan
    if (path.startsWith('/iot-platform/product')) return '#52c41a'; // Green
    if (path.startsWith('/iot-platform/dashboard')) return '#fadb14'; // Gold

    if (path.startsWith('/project-management')) return '#fa541c'; // Volcano

    if (path.startsWith('/account/center')) return '#2f54eb'; // Geekblue
    if (path.startsWith('/account/settings')) return '#595959'; // Grey

    // 默认颜色循环
    const colors = ['#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#fa541c', '#2f54eb'];
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = path.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

// 扁平化菜单树，提取所有可访问的菜单项
export const flattenMenus = (menus: API.MenuTreeNode[]): API.MenuTreeNode[] => {
    const result: API.MenuTreeNode[] = [];

    const traverse = (menuList: API.MenuTreeNode[]) => {
        menuList.forEach((menu) => {
            // 只有叶子节点（有路径且没有子菜单，或者子菜单为空）才作为快速入口
            if (menu.path && (!menu.children || menu.children.length === 0)) {
                // 排除一些特殊的菜单，如 dashboards, welcome 等，只保留功能性菜单
                if (
                    !menu.hideInMenu &&
                    menu.path !== '/welcome' &&
                    menu.path !== '/' &&
                    !menu.path.includes('dashboard')
                ) {
                    result.push(menu);
                }
            }

            if (menu.children && menu.children.length > 0) {
                traverse(menu.children);
            }
        });
    };

    traverse(menus);
    return result;
};

// 获取活动类型对应的颜色
export const getActivityColor = (action?: string): string => {
    if (!action) return 'blue';

    const colorMap: Record<string, string> = {
        'login': 'green',
        'logout': 'red',
        'create': 'blue',
        'update': 'orange',
        'delete': 'red',
        'view': 'cyan',
        'export': 'purple',
        'import': 'purple',
        'change_password': 'orange',
        'refresh_token': 'blue'
    };

    return colorMap[action.toLowerCase()] || 'blue';
};

// 获取资源使用率对应的颜色
export const getResourceColor = (usagePercent: number): string => {
    if (usagePercent > 80) return '#ff4d4f';
    if (usagePercent > 60) return '#faad14';
    return '#52c41a';
};

// 格式化持续时间
export const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
};

// 获取当前时间问候语
export const getGreeting = (intl: IntlShape) => {
    const hour = new Date().getHours();
    if (hour < 6) return intl.formatMessage({ id: 'pages.welcome.greeting.lateNight' });
    if (hour < 12) return intl.formatMessage({ id: 'pages.welcome.greeting.morning' });
    if (hour < 14) return intl.formatMessage({ id: 'pages.welcome.greeting.noon' });
    if (hour < 18) return intl.formatMessage({ id: 'pages.welcome.greeting.afternoon' });
    if (hour < 22) return intl.formatMessage({ id: 'pages.welcome.greeting.evening' });
    return intl.formatMessage({ id: 'pages.welcome.greeting.lateNight' });
};
