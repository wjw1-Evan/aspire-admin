import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { useIntl } from '@umijs/max';
import { MessageOutlined, ReloadOutlined } from '@ant-design/icons';
import { Space, Button } from 'antd';
import ChatHistoryManagement, { type ChatHistoryManagementRef } from './components/ChatHistoryManagement';

const ChatHistoryPage: React.FC = () => {
  const intl = useIntl();
  const chatHistoryManagementRef = useRef<ChatHistoryManagementRef>(null);

  return (
    <PageContainer
      title={
        <Space>
          <MessageOutlined />
          {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => chatHistoryManagementRef.current?.reload()}
          >
            {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.refresh' })}
          </Button>
        </Space>
      }
    >
      <ChatHistoryManagement ref={chatHistoryManagementRef} />
    </PageContainer>
  );
};

export default ChatHistoryPage;
