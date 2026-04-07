import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import EventManagement from './components/EventManagement';

const { Title } = Typography;

const EventManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <Title level={4} style={{ marginBottom: 16 }}><AlertOutlined /> 事件管理</Title>
      <EventManagement />
    </PageContainer>
  );
};

export default EventManagementPage;
