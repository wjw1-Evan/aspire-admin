import React from 'react';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import EventManagement from './components/EventManagement';

const EventManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <EventManagement />
    </PageContainer>
  );
};

export default EventManagementPage;
