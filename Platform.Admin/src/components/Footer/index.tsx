import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <DefaultFooter
      style={{
        background: 'none',
      }}
      copyright="Powered by Ant Desgin"
      links={[
        {
          key: 'Aspire Admin',
          title: 'Aspire Admin',
          href: 'https://learn.microsoft.com/zh-cn/dotnet/aspire/',
          blankTarget: true,
        },
        {
          key: 'github',
          title: <GithubOutlined />,
          href: 'https://github.com/wjw1-Evan/aspire-admin',
          blankTarget: true,
        },
      ]}
    />
  );
};

export default Footer;
