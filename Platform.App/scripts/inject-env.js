#!/usr/bin/env node

/**
 * 注入环境变量脚本
 * 从 Aspire 注入的环境变量 services__apigateway__http__0 读取并注入到应用中
 */

const fs = require('fs');
const path = require('path');

// 读取环境变量
const envKey = 'services__apigateway__http__0';

// 尝试多种方式读取环境变量
let gatewayUrl = 
  process.env[envKey] || 
  process.env['services__apigateway__http__0'] ||
  process.env.SERVICES__APIGATEWAY__HTTP__0 ||
  process.env['SERVICES__APIGATEWAY__HTTP__0'];

// 如果未找到环境变量，尝试从相关键中查找
if (!gatewayUrl) {
  const allKeys = Object.keys(process.env);
  const relatedKeys = allKeys.filter(key => 
    key.toLowerCase().includes('apigateway') || 
    key.toLowerCase().includes('gateway') ||
    key.toLowerCase().includes('service')
  );
  
  // 尝试从相关键中查找
  for (const key of relatedKeys) {
    const value = process.env[key];
    if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
      // 如果找到类似的环境变量，可以使用它
      if (key.toLowerCase().includes('apigateway') || key.toLowerCase().includes('gateway')) {
        gatewayUrl = value;
        break;
      }
    }
  }
  
  // 如果仍未找到，不阻止启动，让应用自己处理错误
  if (!gatewayUrl) {
    process.exit(0);
  }
}

// 创建环境变量配置文件
const envConfigPath = path.join(__dirname, '../constants/env-config.ts');
const envConfigContent = `// 此文件由 scripts/inject-env.js 自动生成，请勿手动编辑
// 从 Aspire 环境变量 services__apigateway__http__0 注入

export const APIGATEWAY_URL = '${gatewayUrl}';
`;

try {
  fs.writeFileSync(envConfigPath, envConfigContent, 'utf8');
} catch (error) {
  console.error('❌ 写入环境变量配置文件失败:', error.message);
  process.exit(1);
}

