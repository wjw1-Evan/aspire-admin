import React from 'react';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import GatewayManagement from './components/GatewayManagement';

const GatewayManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <GatewayManagement />
    </PageContainer>
  );
};

export default GatewayManagementPage;
