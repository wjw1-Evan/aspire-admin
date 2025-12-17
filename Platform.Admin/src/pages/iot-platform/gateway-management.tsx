import React from 'react';
import { PageContainer } from '@/components';
import GatewayManagement from './components/GatewayManagement';

const GatewayManagementPage: React.FC = () => {
  return (
    <PageContainer style={{ paddingBlock: 12 }}>
      <GatewayManagement />
    </PageContainer>
  );
};

export default GatewayManagementPage;

