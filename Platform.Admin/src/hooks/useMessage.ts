import { App } from 'antd';
import { getMessage } from '@/utils/antdAppInstance';

/**
 * 使用 message API 的 Hook
 * 优先使用 App 组件提供的 context-aware message，回退到全局实例
 */
export function useMessage() {
    const { message } = App.useApp();
    return message || getMessage();
}