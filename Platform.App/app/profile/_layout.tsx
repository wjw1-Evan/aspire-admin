// Profile 页面布局

import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#333',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="change-password" 
        options={{
          title: '修改密码',
          headerBackTitle: '返回',
        }}
      />
    </Stack>
  );
}
