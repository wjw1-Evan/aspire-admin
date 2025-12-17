import React from 'react';
import { PageContainer } from '@/components';
import DataPointManagement from './components/DataPointManagement';

const DataPointManagementPage: React.FC = () => {
  return (
    <PageContainer style={{ paddingBlock: 12 }}>
      <DataPointManagement />
    </PageContainer>
  );
};

export default DataPointManagementPage;

