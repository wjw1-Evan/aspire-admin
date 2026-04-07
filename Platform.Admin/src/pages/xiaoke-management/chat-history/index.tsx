import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { MessageOutlined } from '@ant-design/icons';
import { Space } from 'antd';
import ChatHistoryManagement from './components/ChatHistoryManagement';

const ChatHistoryPage: React.FC = () => {
  const intl = useIntl();

  return (
    <PageContainer>
      <ChatHistoryManagement />
    </PageContainer>
  );
};

export default ChatHistoryPage;
