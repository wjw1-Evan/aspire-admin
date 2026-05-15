import React from 'react';
import DataPointManagement from './components/DataPointManagement';
import { PageContainer } from '@ant-design/pro-components';


const DataPointManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <DataPointManagement />
    </PageContainer>
  );
};

export default DataPointManagementPage;
