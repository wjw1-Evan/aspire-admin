import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { Button, Space } from 'antd';
import { ReloadOutlined, BellOutlined } from '@ant-design/icons';
import EventManagement, { EventManagementRef } from './components/EventManagement';

const EventManagementPage: React.FC = () => {
  const managementRef = useRef<EventManagementRef>(null);

  return (
    <PageContainer
      title={
        <Space>
          <BellOutlined />
          事件管理
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              managementRef.current?.reload();
              managementRef.current?.refreshStats();
            }}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <EventManagement ref={managementRef} />
    </PageContainer>
  );
};

export default EventManagementPage;

