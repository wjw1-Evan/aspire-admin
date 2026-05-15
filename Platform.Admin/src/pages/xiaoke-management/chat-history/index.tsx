import { useIntl } from '@umijs/max';
import React from 'react';
import ChatHistoryManagement from './components/ChatHistoryManagement';
import { PageContainer } from '@ant-design/pro-components';


const ChatHistoryPage: React.FC = () => {
  const _intl = useIntl();

  return (
    <PageContainer>
      <ChatHistoryManagement />
    </PageContainer>
  );
};

export default ChatHistoryPage;
