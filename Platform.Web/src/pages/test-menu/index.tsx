import React from 'react';
import { Card, List, Typography } from 'antd';

const { Title, Text } = Typography;

const TestMenuPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={2}>菜单测试页面</Title>
        <Text>如果您能看到这个页面，说明路由配置正确。</Text>
        
        <Title level={4} style={{ marginTop: 24 }}>测试步骤：</Title>
        <List
          size="small"
          dataSource={[
            '1. 检查左侧菜单是否显示"用户管理"',
            '2. 点击"用户管理"菜单项',
            '3. 如果能看到用户管理页面，说明功能正常',
            '4. 如果看不到菜单，请检查权限配置',
            '5. 使用 admin/admin123 登录测试管理员权限'
          ]}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>
    </div>
  );
};

export default TestMenuPage;
