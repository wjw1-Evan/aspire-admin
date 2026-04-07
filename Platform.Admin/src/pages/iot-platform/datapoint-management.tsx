import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import DataPointManagement from './components/DataPointManagement';

const { Title } = Typography;

const DataPointManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <Title level={4} style={{ marginBottom: 16 }}><BarChartOutlined /> 数据点管理</Title>
      <DataPointManagement />
    </PageContainer>
  );
};

export default DataPointManagementPage;
