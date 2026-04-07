import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { DesktopOutlined } from '@ant-design/icons';
import DeviceManagement from './components/DeviceManagement';

const { Title } = Typography;

const DeviceManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <Title level={4} style={{ marginBottom: 16 }}><DesktopOutlined /> 设备管理</Title>
      <DeviceManagement />
    </PageContainer>
  );
};

export default DeviceManagementPage;
