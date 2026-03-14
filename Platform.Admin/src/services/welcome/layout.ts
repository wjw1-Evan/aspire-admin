import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 卡片布局配置
 */
export interface CardLayoutConfig {
    cardId: string;
    order: number;
    column: 'left' | 'right';
    visible: boolean;
}

/**
 * 欢迎页面布局配置
 */
export interface WelcomeLayoutConfig {
    layouts: CardLayoutConfig[];
    updatedAt: string;
}

/**
 * 获取用户的欢迎页面布局配置
 */
export async function getWelcomeLayout() {
    return request<ApiResponse<WelcomeLayoutConfig>>('/api/users/welcome-layout', {
        method: 'GET',
    });
}

/**
 * 保存用户的欢迎页面布局配置
 */
export async function saveWelcomeLayout(config: WelcomeLayoutConfig) {
    return request<ApiResponse<WelcomeLayoutConfig>>('/api/users/welcome-layout', {
        method: 'POST',
        data: config,
    });
}
