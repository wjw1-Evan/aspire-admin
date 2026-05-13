import { PageContainer } from '@ant-design/pro-components/es/layout';
import React from 'react';
import DeviceManagement from './components/DeviceManagement';

const DeviceManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <DeviceManagement />
    </PageContainer>
  );
};

export default DeviceManagementPage;
