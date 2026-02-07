import React from 'react';
import * as AntdIcons from '@ant-design/icons';
import { useIntl } from '@umijs/max';

type IntlShape = ReturnType<typeof useIntl>;

// 根据图标名称获取图标组件
export const getIconComponent = (iconName?: string): React.ReactNode => {
    if (!iconName) return null;

    // 1. 尝试直接获取 (例如 'UserOutlined')
    let Component = (AntdIcons as any)[iconName];

    // 2. 尝试处理 kebab-case 并转为 PascalCase (e.g. user-add -> UserAddOutlined)
    if (!Component) {
        const pascalCase = iconName
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('');

        Component = (AntdIcons as any)[pascalCase] || (AntdIcons as any)[`${pascalCase}Outlined`];
    }

    // 3. 如果还是没有找到，尝试将首字母大写并加上 Outlined 后缀 (e.g. user -> UserOutlined)
    if (!Component && !iconName.endsWith('Outlined') && !iconName.endsWith('Filled') && !iconName.endsWith('TwoTone')) {
        const capitalized = iconName.charAt(0).toUpperCase() + iconName.slice(1);
        Component = (AntdIcons as any)[`${capitalized}Outlined`];
    }

    return Component ? React.createElement(Component) : null;
};

// 根据路径获取菜单颜色
export const getMenuColor = (path: string): string => {
    const p = path.toLowerCase();

    // 系统管理
    if (p.startsWith('/system/user')) return '#1890ff'; // Daybreak Blue
    if (p.startsWith('/system/role')) return '#722ed1'; // Golden Purple
    if (p.startsWith('/system/menu')) return '#fa8c16'; // Sunset Orange
    if (p.startsWith('/system/company') || p.startsWith('/system/company-management')) return '#eb2f96'; // Magenta
    if (p.startsWith('/system/organization')) return '#2f54eb'; // Geekblue
    if (p.startsWith('/system/my-activity') || p.startsWith('/user-log')) return '#52c41a'; // Polar Green

    // 协作与流程
    if (p.startsWith('/workflow')) return '#13c2c2'; // Cyan
    if (p.startsWith('/document')) return '#faad14'; // Gold
    if (p.startsWith('/project-management') || p.startsWith('/task-management')) return '#fa541c'; // Volcano

    // 物联网与网盘
    if (p.startsWith('/iot-platform')) return '#2f54eb'; // Geekblue
    if (p.startsWith('/cloud-storage')) return '#1890ff'; // Daybreak Blue

    // 其他功能
    if (p.startsWith('/xiaoke-management')) return '#eb2f96'; // Magenta
    if (p.startsWith('/password-book')) return '#52c41a'; // Polar Green
    if (p.startsWith('/account/center')) return '#722ed1'; // Golden Purple
    if (p.startsWith('/account/settings')) return '#595959'; // Grey

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
    if (!action) return 'default';
    const a = action.toLowerCase();

    const colorMap: Record<string, string> = {
        // 核心认证与通用
        'login': 'green',
        'logout': 'default',
        'refresh_token': 'geekblue',
        'register': 'blue',

        // 基础 CRUD
        'create': 'blue',
        'update': 'orange',
        'delete': 'red',
        'view': 'cyan',
        'export': 'purple',
        'import': 'magenta',

        // 业务状态
        'activate_user': 'green',
        'deactivate_user': 'volcano',
        'change_password': 'orange',

        // 角色/权限/系统
        'create_role': 'blue',
        'update_role': 'orange',
        'delete_role': 'red',
        'update_user_role': 'gold',
        'bulk_action': 'magenta',
    };

    // 模糊匹配子项 (如 create_user)
    if (colorMap[a]) return colorMap[a];
    if (a.includes('create')) return 'blue';
    if (a.includes('delete') || a.includes('remove')) return 'red';
    if (a.includes('update') || a.includes('edit')) return 'orange';
    if (a.includes('view') || a.includes('get')) return 'cyan';

    return 'default';
};

// 获取活动类型的中文描述
export const getActionText = (action: string): string => {
    if (!action) return '-';
    const a = action.toLowerCase();

    const textMap: Record<string, string> = {
        // 认证相关
        'login': '登录',
        'logout': '登出',
        'refresh_token': '刷新令牌',
        'register': '注册',

        // 基础操作
        'create': '创建',
        'update': '更新',
        'delete': '删除',
        'view': '查看',
        'export': '导出',
        'import': '导入',

        // 用户/账户
        'view_profile': '查看个人资料',
        'update_profile': '更新个人资料',
        'change_password': '修改密码',
        'view_activity_logs': '查看活动日志',
        'activate_user': '启用用户',
        'deactivate_user': '禁用用户',
        'update_user_role': '分配角色',
        'create_user': '创建用户',
        'view_users': '查询用户',
        'delete_user': '删除用户',
        'view_statistics': '查看统计',

        // 业务对象
        'create_role': '创建角色',
        'update_role': '更新角色',
        'delete_role': '删除角色',
        'view_roles': '查看角色',

        'create_menu': '创建菜单',
        'update_menu': '更新菜单',
        'delete_menu': '删除菜单',

        'create_notice': '发布通知',
        'update_notice': '修改通知',
        'delete_notice': '删除通知',

        'bulk_action': '批量操作',
    };

    if (textMap[a]) return textMap[a];

    // 处理复合动作 (如 create_project -> 创建)
    if (a.startsWith('create_')) return `创建${textMap[a.replace('create_', '')] || ''}`;
    if (a.startsWith('update_')) return `更新${textMap[a.replace('update_', '')] || ''}`;
    if (a.startsWith('delete_')) return `删除${textMap[a.replace('delete_', '')] || ''}`;
    if (a.startsWith('view_')) return `查看${textMap[a.replace('view_', '')] || ''}`;

    return action;
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
