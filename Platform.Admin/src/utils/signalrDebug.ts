/**
 * SignalR 调试工具
 * 用于诊断 SignalR 连接问题
 */

import { tokenUtils } from './token';

/**
 * 解析 JWT Token 获取信息
 */
export function parseJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Token 格式无效：不是有效的 JWT' };
    }

    const payload = JSON.parse(atob(parts[1]));
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = now > expiresAt;
    const timeToExpire = Math.round((expiresAt.getTime() - now.getTime()) / 1000);

    return {
      payload,
      expiresAt: expiresAt.toISOString(),
      isExpired,
      timeToExpire: `${timeToExpire}s`,
      isValid: !isExpired,
    };
  } catch (error) {
    return { error: `Token 解析失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 检查 Token 有效性
 */
export function checkTokenValidity() {
  const token = tokenUtils.getToken();

  if (!token) {
    return {
      status: '❌',
      message: 'Token 不存在',
      token: null,
    };
  }

  const parsed = parseJWT(token);

  if ('error' in parsed) {
    return {
      status: '❌',
      message: parsed.error,
      token: null,
    };
  }

  return {
    status: parsed.isValid ? '✅' : '❌',
    message: parsed.isValid ? 'Token 有效' : 'Token 已过期',
    token: parsed,
  };
}

/**
 * 启用 SignalR 协商请求拦截
 */
export function enableSignalRNegotiateDebug() {
  const originalFetch = window.fetch;

  window.fetch = function (...args: any[]) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;

    if (url && url.includes('/negotiate')) {
      console.log('[SignalR Negotiate] 📤 请求:', {
        url,
        method: config?.method || 'GET',
        headers: config?.headers,
      });

      return originalFetch.apply(this, args).then((response) => {
        const status = response.status;
        const contentType = response.headers.get('content-type');

        console.log('[SignalR Negotiate] 📥 响应:', {
          status,
          statusText: response.statusText,
          contentType,
        });

        // 克隆响应以便读取内容
        const clonedResponse = response.clone();
        clonedResponse.text().then((text) => {
          const isJSON = text.startsWith('{');
          const isHTML = text.startsWith('<');

          if (isHTML) {
            console.error('[SignalR Negotiate] ❌ 响应是 HTML（不是 JSON）:', text.substring(0, 300));
          } else if (isJSON) {
            console.log('[SignalR Negotiate] ✅ 响应是有效的 JSON');
            try {
              const json = JSON.parse(text);
              console.log('[SignalR Negotiate] 内容:', json);
            } catch (e) {
              console.error('[SignalR Negotiate] JSON 解析失败:', e);
            }
          } else {
            console.warn('[SignalR Negotiate] ⚠️ 响应格式未知:', text.substring(0, 100));
          }
        });

        return response;
      });
    }

    return originalFetch.apply(this, args);
  } as any;
}

/**
 * 打印完整的 SignalR 诊断信息
 */
export function printSignalRDiagnostics() {
  console.group('🔍 SignalR 诊断信息');

  // 1. Token 检查
  console.group('1️⃣ Token 检查');
  const tokenCheck = checkTokenValidity();
  console.log(`状态: ${tokenCheck.status} ${tokenCheck.message}`);
  if (tokenCheck.token) {
    console.log('Token 信息:', tokenCheck.token);
  }
  console.groupEnd();

  // 2. 浏览器信息
  console.group('2️⃣ 浏览器信息');
  console.log('User Agent:', navigator.userAgent);
  console.log('WebSocket 支持:', typeof WebSocket !== 'undefined');
  console.log('Fetch 支持:', typeof fetch !== 'undefined');
  console.groupEnd();

  // 3. SignalR 配置
  console.group('3️⃣ SignalR 配置');
  console.log('环境:', process.env.NODE_ENV);
  console.log('API 基础 URL:', process.env.REACT_APP_API_BASE_URL || '未配置');
  console.groupEnd();

  console.groupEnd();
}

/**
 * 模拟 SignalR 协商请求（用于测试）
 */
export async function testSignalRNegotiate(hubUrl: string) {
  console.log(`[SignalR Test] 测试协商请求: ${hubUrl}`);

  try {
    const token = tokenUtils.getToken();
    const negotiateUrl = `${hubUrl}/negotiate?negotiateVersion=1`;

    const response = await fetch(negotiateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    console.log('[SignalR Test] 响应状态:', response.status, response.statusText);
    console.log('[SignalR Test] Content-Type:', response.headers.get('content-type'));

    const text = await response.text();

    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log('[SignalR Test] ✅ 协商成功:', json);
        return { success: true, data: json };
      } catch (e) {
        console.error('[SignalR Test] ❌ 响应不是有效的 JSON:', text.substring(0, 200));
        return { success: false, error: 'Invalid JSON response', response: text.substring(0, 200) };
      }
    } else {
      console.error('[SignalR Test] ❌ 协商失败:', text.substring(0, 200));
      return { success: false, error: `HTTP ${response.status}`, response: text.substring(0, 200) };
    }
  } catch (error) {
    console.error('[SignalR Test] ❌ 请求失败:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 在开发环境启用所有调试功能
 */
export function enableAllSignalRDebug() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 启用 SignalR 完整调试模式');

    // 启用协商请求拦截
    enableSignalRNegotiateDebug();

    // 打印诊断信息
    printSignalRDiagnostics();

    // 将工具暴露到全局作用域便于手动测试
    (window as any).__signalrDebug = {
      checkTokenValidity,
      parseJWT,
      printSignalRDiagnostics,
      testSignalRNegotiate,
    };

    console.log('💡 提示: 在浏览器控制台使用 __signalrDebug.* 进行手动测试');
  }
}

