import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { RobotOutlined } from '@ant-design/icons';
import { Space } from 'antd';
import ConfigManagement from './components/ConfigManagement';

const ConfigPage: React.FC = () => {
  const intl = useIntl();

  return (
    <PageContainer
      title={
        <Space>
          <RobotOutlined />
          {intl.formatMessage({ id: 'pages.xiaokeManagement.config.title' })}
        </Space>
      }
    >
      <ConfigManagement />
    </PageContainer>
  );
};

export default ConfigPage;
