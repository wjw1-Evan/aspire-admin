/**
 * Ant Design App 实例存储
 * 用于在非 React 组件中使用 message 和 notification
 * 解决静态方法无法消费动态主题的问题
 */

import type { App } from 'antd';

let appInstance: App | null = null;

/**
 * 设置 App 实例
 */
export function setAppInstance(app: App) {
  appInstance = app;
}

/**
 * 获取 App 实例
 */
export function getAppInstance(): App | null {
  return appInstance;
}

/**
 * 获取 message API
 */
export function getMessage() {
  if (!appInstance) {
    // 如果还没有设置实例，回退到静态方法（会显示警告，但不影响功能）
    const { message } = require('antd');
    return message;
  }
  return appInstance.message;
}

/**
 * 获取 notification API
 */
export function getNotification() {
  if (!appInstance) {
    // 如果还没有设置实例，回退到静态方法（会显示警告，但不影响功能）
    const { notification } = require('antd');
    return notification;
  }
  return appInstance.notification;
}
