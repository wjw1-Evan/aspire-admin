import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import EventManagement from './components/EventManagement';

const EventManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <EventManagement />
    </PageContainer>
  );
};

export default EventManagementPage;
