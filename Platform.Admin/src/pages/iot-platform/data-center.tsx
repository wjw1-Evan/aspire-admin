import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import DataCenter from './components/DataCenter';

const { Title } = Typography;

const DataCenterPage: React.FC = () => {
  return (
    <PageContainer>
      <Title level={4} style={{ marginBottom: 16 }}><DatabaseOutlined /> 数据中心</Title>
      <DataCenter />
    </PageContainer>
  );
};

export default DataCenterPage;
