import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import EventManagement from './components/EventManagement';

const EventManagementPage: React.FC = () => {
  return (
    <PageContainer
      title={
        <Space>
          <BellOutlined />
          事件管理
        </Space>
      }
    >
      <EventManagement />
    </PageContainer>
  );
};

export default EventManagementPage;
