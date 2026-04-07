import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import DataPointManagement from './components/DataPointManagement';

const DataPointManagementPage: React.FC = () => {
  return (
    <PageContainer
      title={
        <Space>
          <DatabaseOutlined />
          数据点管理
        </Space>
      }
    >
      <DataPointManagement />
    </PageContainer>
  );
};

export default DataPointManagementPage;
