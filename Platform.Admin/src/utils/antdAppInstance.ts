/**
 * Ant Design App 实例存储
 * 用于在非 React 组件中使用 message 和 notification
 * 解决静态方法无法消费动态主题的问题
 */

<<<<<<< HEAD
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';

type AppInstance = {
  message: MessageInstance;
  notification: NotificationInstance;
  modal: ModalStaticFunctions;
};

let appInstance: AppInstance | null = null;
=======
import { App } from 'antd';
import type { useAppProps } from 'antd/es/app/context';

let appInstance: useAppProps | null = null;
>>>>>>> 0b9b9ef (feat: refactor table column definitions and improve action handling in task and project management components)

/**
 * 设置 App 实例
 */
<<<<<<< HEAD
export function setAppInstance(app: AppInstance) {
=======
export function setAppInstance(app: useAppProps) {
>>>>>>> 0b9b9ef (feat: refactor table column definitions and improve action handling in task and project management components)
  appInstance = app;
}

/**
 * 获取 App 实例
 */
<<<<<<< HEAD
export function getAppInstance(): AppInstance | null {
=======
export function getAppInstance(): useAppProps | null {
>>>>>>> 0b9b9ef (feat: refactor table column definitions and improve action handling in task and project management components)
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
