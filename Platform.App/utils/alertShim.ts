/**
 * Web Alert Shim
 * 拦截 React Native Alert，在 Web 端使用自定义事件机制
 */

import { Alert, Platform } from 'react-native';
import type { AlertButton, AlertOptions, AlertType } from 'react-native';

export const ALERT_EVENT_NAME = 'platform-app-alert';

export interface AlertEventDetail {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  type?: AlertType;
}

/**
 * 订阅 Alert 事件
 */
export function addAlertListener(callback: (detail: AlertEventDetail) => void) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<AlertEventDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener(ALERT_EVENT_NAME, handler as EventListener);

  return () => {
    window.removeEventListener(ALERT_EVENT_NAME, handler as EventListener);
  };
}

if (Platform.OS === 'web') {
  const patchedAlert = (
    title?: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
    type?: AlertType
  ) => {
    if (typeof window === 'undefined') {
      console.warn('Alert:', title, message);
      return;
    }

    const detail: AlertEventDetail = {
      title,
      message,
      buttons,
      options,
      type,
    };

    window.dispatchEvent(new CustomEvent<AlertEventDetail>(ALERT_EVENT_NAME, { detail }));
  };

  // 使用自定义实现替换 Alert.alert
  (Alert as unknown as { alert: typeof patchedAlert }).alert = patchedAlert;
}


