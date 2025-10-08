#!/usr/bin/env node

const os = require('os');

/**
 * 获取本机IP地址的脚本
 * 用于帮助开发者配置移动端应用的API地址
 */

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部地址和非IPv4地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return null;
}

function main() {
  console.log('🔍 正在获取本机IP地址...\n');
  
  const ip = getLocalIP();
  
  if (ip) {
    const gatewayUrl = `http://${ip}:15000`;
    const apiUrl = `${gatewayUrl}/apiservice`;
    
    console.log(`✅ 找到本机IP地址: ${ip}`);
    console.log(`🌐 API网关地址: ${gatewayUrl}`);
    console.log(`📱 移动端API地址: ${apiUrl}`);
    
    console.log('\n📝 配置方法:');
    console.log('\n1. 使用环境变量（推荐）:');
    console.log(`   export EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0="${gatewayUrl}"`);
    console.log('\n2. 或在 .env.local 文件中设置:');
    console.log(`   EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0=${gatewayUrl}`);
    console.log('\n3. 或使用原始环境变量名:');
    console.log(`   export services__apigateway__http__0="${gatewayUrl}"`);
    
    console.log('\n3. 或修改 constants/apiConfig.ts 文件:');
    console.log(`   GATEWAY_URL: '${gatewayUrl}',`);
    
    console.log('\n🚀 配置完成后，重启移动端应用即可正常访问API。');
  } else {
    console.log('❌ 无法获取本机IP地址');
    console.log('💡 请手动检查网络设置或使用以下命令:');
    console.log('   macOS: ipconfig getifaddr en0');
    console.log('   Windows: ipconfig');
    console.log('   Linux: hostname -I');
  }
}

if (require.main === module) {
  main();
}

module.exports = { getLocalIP };
