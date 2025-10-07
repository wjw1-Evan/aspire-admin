// 认证调试工具

import { apiService } from '@/services/api';
import { authService } from '@/services/auth';

export class AuthDebugUtils {
  // 测试完整的认证流程
  static async testAuthFlow() {
    console.log('=== 开始认证流程测试 ===');
    
    try {
      // 1. 测试token获取
      console.log('1. 测试token获取...');
      const token = await apiService.getToken();
      console.log('Token存在:', !!token);
      console.log('Token长度:', token?.length || 0);
      
      // 2. 测试token验证
      console.log('2. 测试token验证...');
      const isValid = await apiService.validateToken();
      console.log('Token有效:', isValid);
      
      // 3. 测试获取用户信息
      console.log('3. 测试获取用户信息...');
      const userResponse = await authService.getCurrentUser();
      console.log('用户响应:', userResponse);
      
      // 4. 详细分析用户响应
      if (userResponse) {
        console.log('4. 用户响应分析:');
        console.log('- success:', userResponse.success);
        console.log('- data存在:', !!userResponse.data);
        console.log('- isLogin:', userResponse.data?.isLogin);
        console.log('- access:', userResponse.data?.access);
        console.log('- name:', userResponse.data?.name);
      }
      
      // 5. 测试网络连接
      console.log('5. 测试网络连接...');
      const isOnline = await apiService.isOnline();
      console.log('网络状态:', isOnline);
      
      // 6. 测试API基础URL
      console.log('6. 测试API基础URL...');
      const baseUrl = apiService['getBaseURL']();
      console.log('API基础URL:', baseUrl);
      
      console.log('=== 认证流程测试完成 ===');
      
      return {
        hasToken: !!token,
        tokenValid: isValid,
        userLoggedIn: userResponse.success && userResponse.data?.isLogin !== false,
        userAccess: userResponse.data?.access,
        userName: userResponse.data?.name,
        networkOnline: isOnline,
        apiBaseUrl: baseUrl,
      };
    } catch (error) {
      console.error('认证流程测试失败:', error);
      return {
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
  
  // 测试登录流程
  static async testLoginFlow(username: string, password: string) {
    console.log('=== 开始登录流程测试 ===');
    
    try {
      // 1. 执行登录
      console.log('1. 执行登录...');
      const loginResult = await authService.login({
        username,
        password,
        autoLogin: true,
        type: 'account',
      });
      console.log('登录结果:', loginResult);
      
      // 2. 验证token保存
      console.log('2. 验证token保存...');
      const token = await apiService.getToken();
      console.log('保存的token:', !!token);
      
      // 3. 获取用户信息
      console.log('3. 获取用户信息...');
      const userResponse = await authService.getCurrentUser();
      console.log('用户信息:', userResponse);
      
      // 4. 验证token有效性
      console.log('4. 验证token有效性...');
      const isValid = await apiService.validateToken();
      console.log('Token验证结果:', isValid);
      
      console.log('=== 登录流程测试完成 ===');
      
      return {
        loginSuccess: loginResult.status === 'ok',
        tokenSaved: !!token,
        userInfoRetrieved: userResponse.success,
        tokenValid: isValid,
      };
    } catch (error) {
      console.error('登录流程测试失败:', error);
      return {
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
  
  // 测试登出流程
  static async testLogoutFlow() {
    console.log('=== 开始登出流程测试 ===');
    
    try {
      // 1. 执行登出
      console.log('1. 执行登出...');
      await authService.logout();
      console.log('登出完成');
      
      // 2. 验证token清除
      console.log('2. 验证token清除...');
      const token = await apiService.getToken();
      console.log('Token已清除:', !token);
      
      // 3. 验证用户信息清除
      console.log('3. 验证用户信息清除...');
      try {
        const userResponse = await authService.getCurrentUser();
        console.log('用户信息获取结果:', userResponse);
      } catch (error) {
        console.log('用户信息获取失败（预期行为）:', error);
      }
      
      console.log('=== 登出流程测试完成 ===');
      
      return {
        logoutSuccess: true,
        tokenCleared: !token,
      };
    } catch (error) {
      console.error('登出流程测试失败:', error);
      return {
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
  
  // 测试修复后的token验证逻辑
  static async testTokenValidationFix() {
    console.log('=== 测试修复后的Token验证逻辑 ===');
    
    try {
      // 1. 模拟API响应（基于你提供的真实数据）
      const mockResponse = {
        "success": true,
        "data": {
          "id": "68e4c5ca023be404e8352c07",
          "name": "admin",
          "access": "admin",
          "isLogin": true
        }
      };
      
      console.log('1. 测试成功响应:');
      console.log('- success:', mockResponse.success);
      console.log('- data.isLogin:', mockResponse.data.isLogin);
      console.log('- 预期结果: Token有效 =', mockResponse.success && mockResponse.data.isLogin !== false);
      
      // 2. 测试失败响应
      const mockFailResponse = {
        "success": true,
        "data": {
          "isLogin": false
        }
      };
      
      console.log('2. 测试失败响应:');
      console.log('- success:', mockFailResponse.success);
      console.log('- data.isLogin:', mockFailResponse.data.isLogin);
      console.log('- 预期结果: Token无效 =', !(mockFailResponse.success && mockFailResponse.data.isLogin !== false));
      
      // 3. 实际测试当前token验证
      console.log('3. 实际测试当前token验证:');
      const isValid = await apiService.validateToken();
      console.log('- 当前token验证结果:', isValid);
      
      // 4. 测试获取用户信息
      console.log('4. 测试获取用户信息:');
      const userResponse = await authService.getCurrentUser();
      console.log('- API调用成功:', userResponse.success);
      console.log('- 用户登录状态:', userResponse.data?.isLogin);
      console.log('- 用户权限:', userResponse.data?.access);
      console.log('- 用户名:', userResponse.data?.name);
      
      console.log('=== Token验证逻辑测试完成 ===');
      
      return {
        mockSuccessTest: mockResponse.success && mockResponse.data.isLogin !== false,
        mockFailTest: !(mockFailResponse.success && mockFailResponse.data.isLogin !== false),
        actualTokenValid: isValid,
        actualUserLoggedIn: userResponse.success && userResponse.data?.isLogin !== false,
      };
    } catch (error) {
      console.error('Token验证逻辑测试失败:', error);
      return {
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  // 监控认证状态变化
  static startAuthMonitoring() {
    console.log('=== 开始认证状态监控 ===');
    
    let lastToken: string | null = null;
    let lastUserInfo: any = null;
    
    const monitor = setInterval(async () => {
      try {
        const token = await apiService.getToken();
        const userResponse = await authService.getCurrentUser();
        
        if (token !== lastToken) {
          console.log('Token变化:', {
            from: lastToken ? '存在' : '不存在',
            to: token ? '存在' : '不存在',
            timestamp: new Date().toISOString(),
          });
          lastToken = token;
        }
        
        if (JSON.stringify(userResponse) !== JSON.stringify(lastUserInfo)) {
          console.log('用户信息变化:', {
            from: lastUserInfo ? '已登录' : '未登录',
            to: userResponse.data?.isLogin ? '已登录' : '未登录',
            timestamp: new Date().toISOString(),
          });
          lastUserInfo = userResponse;
        }
      } catch (error) {
        console.error('监控过程中出错:', error);
      }
    }, 5000); // 每5秒检查一次
    
    return () => {
      clearInterval(monitor);
      console.log('=== 停止认证状态监控 ===');
    };
  }
}
