/**
 * Ant Design App 实例存储
 * 用于在非 React 组件中使用 message 和 notification
 * 解决静态方法无法消费动态主题的问题
 */

import { App, message, notification } from 'antd';
import type { useAppProps } from 'antd/es/app/context';

// 预加载静态方法作为 fallback
const staticMessage = message;
const staticNotification = notification;

let appInstance: useAppProps | null = null;
let cachedMessage: any = null;
let cachedNotification: any = null;

/**
 * 设置 App 实例
 */
export function setAppInstance(app: useAppProps) {
  appInstance = app;
  cachedMessage = app.message;
  cachedNotification = app.notification;
}

/**
 * 获取 message API - 优先使用 App 实例，回退到静态方法
 */
export function getMessage() {
  if (cachedMessage) {
    return cachedMessage;
  }
  return staticMessage;
}

/**
 * 获取 notification API - 优先使用 App 实例，回退到静态方法
 */
export function getNotification() {
  if (cachedNotification) {
    return cachedNotification;
  }
  return staticNotification;
}
