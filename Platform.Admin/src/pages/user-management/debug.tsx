import React from 'react';
import { Card, Descriptions, Button, message } from 'antd';
import { useModel } from '@umijs/max';

const DebugPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');

  const checkAccess = () => {
    const { currentUser } = initialState ?? {};
    const canAdmin = currentUser && currentUser.access === 'admin';
    
    message.info(`当前用户权限: ${canAdmin ? '管理员' : '普通用户'}`);
    console.log('Current user:', currentUser);
    console.log('Can admin:', canAdmin);
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="用户权限调试信息">
        <Descriptions column={1}>
          <Descriptions.Item label="当前用户">
            {initialState?.currentUser ? '已登录' : '未登录'}
          </Descriptions.Item>
          <Descriptions.Item label="用户信息">
            <pre>{JSON.stringify(initialState?.currentUser, null, 2)}</pre>
          </Descriptions.Item>
          <Descriptions.Item label="权限检查">
            <Button onClick={checkAccess}>检查权限</Button>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default DebugPage;
