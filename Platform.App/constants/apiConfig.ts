// API 配置常量

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 获取环境变量中的 API 网关地址
const getApiGatewayUrl = (): string => {
  // 优先从 EXPO_PUBLIC_ 前缀的环境变量读取（推荐）
  if (
    typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0
  ) {
    console.log(
      "✅ 找到环境变量 EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0:",
      process.env.EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0
    );
    return process.env.EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0;
  }
  
  // 兼容原始环境变量名
  if (
    typeof process !== "undefined" &&
    process.env?.services__apigateway__http__0
  ) {
    console.log(
      "✅ 找到环境变量 services__apigateway__http__0:",
      process.env.services__apigateway__http__0
    );
    return process.env.services__apigateway__http__0;
  }
  
  // 开发环境默认值
  if (__DEV__) {
    const defaultUrl = resolveDevGatewayUrl();
    console.warn(
      "⚠️ 环境变量未找到，使用推断的开发环境地址:",
      defaultUrl
    );
    return defaultUrl;
  }
  
  console.error("❌ 环境变量未找到且非开发环境");
  throw new Error(
    "API网关地址未配置，请设置环境变量 EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0 或 services__apigateway__http__0"
  );
};

// 动态获取 API 网关地址（解决生命周期问题）
export const getApiGatewayUrlDynamic = (): string => {
  return getApiGatewayUrl();
};

// 获取完整的 API 基础 URL（动态获取，解决生命周期问题）
export const getApiBaseUrl = (): string => {
  const gatewayUrl = getApiGatewayUrlDynamic();
  return `${gatewayUrl}/apiservice/api`;
};

// 获取 API 超时时间
export const getApiTimeout = (): number => {
  return 10000; // 10秒超时
};

// 检查是否为开发环境
export const isDevelopment = (): boolean => {
  return __DEV__;
};

// 检查是否为生产环境
export const isProduction = (): boolean => {
  return !__DEV__;
};

function resolveDevGatewayUrl(): string {
  if (Platform.OS === 'web') {
    const protocol = window?.location?.protocol ?? 'http:';
    const hostname = window?.location?.hostname ?? 'localhost';
    return `${protocol}//${hostname}:15000`;
  }

  const expoHost = extractExpoHost();
  const host = expoHost ?? '127.0.0.1';
  return `http://${host}:15000`;
}

function extractExpoHost(): string | undefined {
  const expoConfigHost = Constants?.expoConfig?.hostUri;
  if (expoConfigHost) {
    return expoConfigHost.split(':')[0];
  }

  const debuggerHost =
    (Constants as unknown as Record<string, any>)?.expoGoConfig?.debuggerHost ??
    (Constants as unknown as Record<string, any>)?.manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as unknown as Record<string, any>)?.manifest?.debuggerHost;

  if (typeof debuggerHost === 'string') {
    return debuggerHost.split(':')[0];
  }

  const scriptURL = (global as unknown as Record<string, any>)?.nativeExtensions?.NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL === 'string') {
    try {
      const { hostname } = new URL(scriptURL);
      return hostname;
    } catch {
      return undefined;
    }
  }

  return undefined;
}
