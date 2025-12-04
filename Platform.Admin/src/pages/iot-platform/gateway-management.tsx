import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import GatewayManagement from './components/GatewayManagement';

const GatewayManagementPage: React.FC = () => {
  return (
    <PageContainer style={{ paddingBlock: 12 }}>
      <GatewayManagement />
    </PageContainer>
  );
};

export default GatewayManagementPage;

