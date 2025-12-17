import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { Button, Space } from 'antd';
import { PlusOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import DataPointManagement, { DataPointManagementRef } from './components/DataPointManagement';

const DataPointManagementPage: React.FC = () => {
  const managementRef = useRef<DataPointManagementRef>(null);

  return (
    <PageContainer
      title={
        <Space>
          <DatabaseOutlined />
          数据点管理
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
            新建数据点
          </Button>
        </Space>
      }
    >
      <DataPointManagement ref={managementRef} />
    </PageContainer>
  );
};

export default DataPointManagementPage;

