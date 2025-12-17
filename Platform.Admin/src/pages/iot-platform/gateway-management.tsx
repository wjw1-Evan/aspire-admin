import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { Button, Space } from 'antd';
import { PlusOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons';
import GatewayManagement, { GatewayManagementRef } from './components/GatewayManagement';

const GatewayManagementPage: React.FC = () => {
  const managementRef = useRef<GatewayManagementRef>(null);

  return (
    <PageContainer
      title={
        <Space>
          <ApiOutlined />
          网关管理
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
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              managementRef.current?.handleAdd();
            }}
          >
            新建网关
          </Button>
        </Space>
      }
    >
      <GatewayManagement ref={managementRef} />
    </PageContainer>
  );
};

export default GatewayManagementPage;

