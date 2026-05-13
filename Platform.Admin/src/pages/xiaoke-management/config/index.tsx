import { PageContainer } from '@ant-design/pro-components/es/layout';
import { useIntl } from '@umijs/max';
import React from 'react';
import ConfigManagement from './components/ConfigManagement';

const ConfigPage: React.FC = () => {
  const _intl = useIntl();

  return (
    <PageContainer>
      <ConfigManagement />
    </PageContainer>
  );
};

export default ConfigPage;
