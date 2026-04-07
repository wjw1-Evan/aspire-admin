import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space } from 'antd';
import { HddOutlined } from '@ant-design/icons';
import DataCenter from './components/DataCenter';

const DataCenterPage: React.FC = () => {
  return (
    <PageContainer>
      <DataCenter />
    </PageContainer>
  );
};

export default DataCenterPage;
