
// API 配置常量

// 尝试导入由启动脚本注入的环境变量配置
let injectedConfig: { APIGATEWAY_URL?: string } | null = null;
try {
  // 动态导入，如果文件不存在也不会报错
  injectedConfig = require('./env-config');
} catch {
  // 文件不存在，忽略
}

// 获取环境变量中的 API 网关地址
// 仅从环境变量 services__apigateway__http__0 读取，不可从其他地方读取
// 注意：在 React Native 中，process.env 无法访问运行时环境变量
// 因此需要通过启动脚本注入到配置文件中
const getApiGatewayUrl = (): string => {
  const envKey = 'services__apigateway__http__0';
  
  // 方法1: 优先从启动脚本注入的配置文件读取（适用于所有平台）
  // 这是最可靠的方式，因为启动脚本在 Node.js 环境中运行，可以访问环境变量
  if (injectedConfig?.APIGATEWAY_URL) {
    return injectedConfig.APIGATEWAY_URL;
  }
  
  // 方法2: 尝试从 process.env 读取（仅 Web 平台，且需要构建时注入）
  // 注意：在 React Native 原生平台，process.env 不可用
  if (typeof process !== "undefined" && process.env) {
    const gatewayUrl = process.env[envKey];
    if (gatewayUrl) {
      return gatewayUrl;
    }
  }
  
  throw new Error(
    "API网关地址未配置，请设置环境变量 services__apigateway__http__0。\n" +
    "启动脚本应该会自动注入，如果未找到，请检查启动日志。"
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
