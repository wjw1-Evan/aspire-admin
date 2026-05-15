import React from 'react';
import EventManagement from './components/EventManagement';
import { PageContainer } from '@ant-design/pro-components';


const EventManagementPage: React.FC = () => {
  return (
    <PageContainer>
      <EventManagement />
    </PageContainer>
  );
};

export default EventManagementPage;
