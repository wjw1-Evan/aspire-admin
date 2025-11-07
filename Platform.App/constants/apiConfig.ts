// API 配置常量

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
    const defaultUrl = "http://localhost:15000";
    console.warn(
      "⚠️ 环境变量未找到，使用默认开发环境地址:",
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
