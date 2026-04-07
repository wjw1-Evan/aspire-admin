import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space } from 'antd';
import { DesktopOutlined } from '@ant-design/icons';
import DeviceManagement from './components/DeviceManagement';

const DeviceManagementPage: React.FC = () => {
  return (
    <PageContainer
      title={
        <Space>
          <DesktopOutlined />
          设备管理
        </Space>
      }
    >
      <DeviceManagement />
    </PageContainer>
  );
};

export default DeviceManagementPage;
