import { history, useIntl } from '@umijs/max';
import { Button, Result } from 'antd';
import React from 'react';

const NoFoundPage: React.FC = () => (
  <div style={{ padding: 24 }}>
    <Result
      status="404"
      title="404"
      subTitle={useIntl().formatMessage({ id: 'pages.404.subTitle' })}
      extra={
        <Button type="primary" onClick={() => history.push('/')}>
          {useIntl().formatMessage({ id: 'pages.404.buttonText' })}
        </Button>
      }
    />
  </div>
);

export default NoFoundPage;
