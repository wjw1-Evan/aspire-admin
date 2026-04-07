import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import GatewayManagement from './components/GatewayManagement';

const GatewayManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <GatewayManagement />
    </PageContainer>
  );
};

export default GatewayManagementPage;
