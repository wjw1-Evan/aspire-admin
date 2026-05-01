import { CheckCircleOutlined } from '@ant-design/icons';
import { Result, Button } from 'antd';
import { FormattedMessage, history, useIntl } from '@umijs/max';
import { createStyles } from 'antd-style';
import React from 'react';

const useStyles = createStyles(() => {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
    content: {
      flex: '1',
      padding: '32px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
});

const RegisterResult: React.FC = () => {
  const { styles } = useStyles();
  const intl = useIntl();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title={intl.formatMessage({
            id: 'pages.register.result.title',
                      })}
          subTitle={intl.formatMessage({
            id: 'pages.register.result.subtitle',
                      })}
          extra={[
            <Button
              type="primary"
              key="login"
              onClick={() => {
                history.push('/user/login');
              }}
            >
              <FormattedMessage
                id="pages.register.result.login"
               
              />
            </Button>,
            <Button
              key="home"
              onClick={() => {
                history.push('/');
              }}
            >
              <FormattedMessage
                id="pages.register.result.home"
               
              />
            </Button>,
          ]}
        />
      </div>
    </div>
  );
};

export default RegisterResult;
