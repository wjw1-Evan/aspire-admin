/**
 * 自定义 Hook：使用 Ant Design 的 message API
 * 解决静态方法无法消费动态主题的问题
 */

import { getMessage } from '@/utils/antdAppInstance';

/**
 * 使用 message API 的 Hook
 * 优先使用 App 实例提供的 message，回退到静态方法
 */
export function useMessage() {
    return getMessage();
}