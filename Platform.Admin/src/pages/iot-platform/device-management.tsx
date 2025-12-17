import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { Button, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import DeviceManagement, { DeviceManagementRef } from './components/DeviceManagement';

const DeviceManagementPage: React.FC = () => {
  const managementRef = useRef<DeviceManagementRef>(null);

  return (
    <PageContainer
      title="设备管理"
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
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              managementRef.current?.handleAdd();
            }}
          >
            新建设备
          </Button>
        </Space>
      }
    >
      <DeviceManagement ref={managementRef} />
    </PageContainer>
  );
};

export default DeviceManagementPage;

