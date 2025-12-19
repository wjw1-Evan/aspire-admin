import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { useIntl } from '@umijs/max';
import { RobotOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Space, Button } from 'antd';
import ConfigManagement, { type ConfigManagementRef } from './components/ConfigManagement';

const ConfigPage: React.FC = () => {
  const intl = useIntl();
  const configManagementRef = useRef<ConfigManagementRef>(null);

  return (
    <PageContainer
      title={
        <Space>
          <RobotOutlined />
          {intl.formatMessage({ id: 'pages.xiaokeManagement.config.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => configManagementRef.current?.reload()}
          >
            {intl.formatMessage({ id: 'pages.xiaokeManagement.config.refresh' })}
          </Button>
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => configManagementRef.current?.handleCreate()}
          >
            {intl.formatMessage({ id: 'pages.xiaokeManagement.config.createConfig' })}
          </Button>
        </Space>
      }
    >
      <ConfigManagement ref={configManagementRef} />
    </PageContainer>
  );
};

export default ConfigPage;
