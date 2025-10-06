// Token验证测试工具

import { apiService } from '@/services/api';
import { authService } from '@/services/auth';

export class TokenTestUtils {
  // 测试token验证功能
  static async testTokenValidation() {
    console.log('=== Token验证测试开始 ===');
    
    try {
      // 1. 测试无token情况
      console.log('1. 测试无token情况...');
      const hasToken = await apiService.getToken();
      console.log('当前是否有token:', !!hasToken);
      
      // 2. 测试token验证
      console.log('2. 测试token验证...');
      const isValid = await apiService.validateToken();
      console.log('Token是否有效:', isValid);
      
      // 3. 测试用户信息获取
      if (isValid) {
        console.log('3. 测试用户信息获取...');
        try {
          const userResponse = await authService.getCurrentUser();
          console.log('用户信息获取结果:', userResponse.success);
          if (userResponse.success && userResponse.data) {
            console.log('用户登录状态:', userResponse.data.isLogin);
            console.log('用户名:', userResponse.data.name);
          }
        } catch (error) {
          console.log('用户信息获取失败:', error);
        }
      }
      
      // 4. 测试认证状态检查
      console.log('4. 测试认证状态检查...');
      const isAuthenticated = await authService.isAuthenticated();
      console.log('认证状态:', isAuthenticated);
      
    } catch (error) {
      console.error('Token验证测试失败:', error);
    }
    
    console.log('=== Token验证测试结束 ===');
  }
  
  // 模拟token过期情况
  static async simulateTokenExpiration() {
    console.log('=== 模拟Token过期测试开始 ===');
    
    try {
      // 保存当前token
      const currentToken = await apiService.getToken();
      console.log('当前token:', currentToken ? '存在' : '不存在');
      
      if (currentToken) {
        // 清除token
        console.log('清除token...');
        await apiService.removeToken();
        
        // 验证token是否被清除
        const tokenAfterRemoval = await apiService.getToken();
        console.log('清除后token状态:', tokenAfterRemoval ? '仍存在' : '已清除');
        
        // 测试验证无效token
        const isValidAfterRemoval = await apiService.validateToken();
        console.log('清除后token验证结果:', isValidAfterRemoval);
      }
      
    } catch (error) {
      console.error('模拟Token过期测试失败:', error);
    }
    
    console.log('=== 模拟Token过期测试结束 ===');
  }
  
  // 测试API请求中的token验证
  static async testApiRequestWithInvalidToken() {
    console.log('=== API请求Token验证测试开始 ===');
    
    try {
      // 清除token
      await apiService.removeToken();
      
      // 尝试调用需要认证的API
      console.log('尝试调用需要认证的API...');
      try {
        const response = await authService.getCurrentUser();
        console.log('API调用结果:', response);
      } catch (error) {
        console.log('API调用失败（预期）:', error);
      }
      
    } catch (error) {
      console.error('API请求Token验证测试失败:', error);
    }
    
    console.log('=== API请求Token验证测试结束 ===');
  }
  
  // 测试401状态码处理和自动登出
  static async test401Handling() {
    console.log('=== 401状态码处理测试开始 ===');
    
    try {
      // 1. 先获取当前token
      const currentToken = await apiService.getToken();
      console.log('1. 当前token状态:', currentToken ? '存在' : '不存在');
      
      if (!currentToken) {
        console.log('没有token，跳过401测试');
        return;
      }
      
      // 2. 模拟设置一个无效的token（过期或无效）
      console.log('2. 设置无效token进行测试...');
      await apiService.setToken('invalid_token_for_testing');
      
      // 3. 尝试调用需要认证的API，应该返回401
      console.log('3. 尝试调用API，预期返回401...');
      try {
        const response = await authService.getCurrentUser();
        console.log('API调用成功（意外）:', response);
      } catch (error) {
        console.log('API调用失败（预期）:', error);
        
        // 4. 检查token是否被清除
        const tokenAfter401 = await apiService.getToken();
        console.log('4. 401处理后token状态:', tokenAfter401 ? '仍存在' : '已清除');
        
        if (!tokenAfter401) {
          console.log('✅ 401处理成功：token已被清除');
        } else {
          console.log('❌ 401处理失败：token未被清除');
        }
      }
      
    } catch (error) {
      console.error('401状态码处理测试失败:', error);
    }
    
    console.log('=== 401状态码处理测试结束 ===');
  }
}

// 导出测试函数供开发时使用
export const runTokenTests = async () => {
  await TokenTestUtils.testTokenValidation();
  await TokenTestUtils.simulateTokenExpiration();
  await TokenTestUtils.testApiRequestWithInvalidToken();
  await TokenTestUtils.test401Handling();
};
