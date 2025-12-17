import React from 'react';
import { PageContainer } from '@/components';
import DataCenter from './components/DataCenter';

const DataCenterPage: React.FC = () => {
  return (
    <PageContainer style={{ paddingBlock: 12 }}>
      <DataCenter />
    </PageContainer>
  );
};

export default DataCenterPage;

