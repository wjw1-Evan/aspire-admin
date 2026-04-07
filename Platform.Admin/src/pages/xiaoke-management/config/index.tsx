import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { RobotOutlined } from '@ant-design/icons';
import { Space } from 'antd';
import ConfigManagement from './components/ConfigManagement';

const ConfigPage: React.FC = () => {
  const intl = useIntl();

  return (
    <PageContainer>
      <ConfigManagement />
    </PageContainer>
  );
};

export default ConfigPage;
