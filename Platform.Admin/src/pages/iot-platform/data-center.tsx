import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import DataCenter, { DataCenterRef } from './components/DataCenter';

const DataCenterPage: React.FC = () => {
  const centerRef = useRef<DataCenterRef>(null);

  return (
    <PageContainer
      title="数据中心"
      style={{ paddingBlock: 12 }}
      extra={
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              centerRef.current?.reload();
            }}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <DataCenter ref={centerRef} />
    </PageContainer>
  );
};

export default DataCenterPage;

