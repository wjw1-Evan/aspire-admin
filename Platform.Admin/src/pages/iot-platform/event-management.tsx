import React from 'react';
import { PageContainer } from '@/components';
import EventManagement from './components/EventManagement';

const EventManagementPage: React.FC = () => {
  return (
    <PageContainer style={{ paddingBlock: 12 }}>
      <EventManagement />
    </PageContainer>
  );
};

export default EventManagementPage;

