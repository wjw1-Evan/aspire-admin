// 认证入口页面 - 重定向到登录页面

import { Redirect } from 'expo-router';

export default function AuthIndex() {
  return <Redirect href="/auth/login" />;
}
