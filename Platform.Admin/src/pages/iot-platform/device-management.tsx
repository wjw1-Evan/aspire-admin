import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import DeviceManagement from './components/DeviceManagement';

const DeviceManagementPage: React.FC = () => {
  return (
    <PageContainer style={{ paddingBlock: 12 }}>
      <DeviceManagement />
    </PageContainer>
  );
};

export default DeviceManagementPage;

