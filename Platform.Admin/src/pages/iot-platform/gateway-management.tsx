import React from 'react';
import GatewayManagement from './components/GatewayManagement';
import { PageContainer } from '@ant-design/pro-components';


const GatewayManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <GatewayManagement />
    </PageContainer>
  );
};

export default GatewayManagementPage;
