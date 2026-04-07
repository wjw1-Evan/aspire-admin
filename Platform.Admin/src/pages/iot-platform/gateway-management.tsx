import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import GatewayManagement from './components/GatewayManagement';

const { Title } = Typography;

const GatewayManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <Title level={4} style={{ marginBottom: 16 }}><CloudServerOutlined /> 网关管理</Title>
      <GatewayManagement />
    </PageContainer>
  );
};

export default GatewayManagementPage;
