import { GithubOutlined } from '@ant-design/icons';
import React from 'react';
import { Layout } from 'antd';

const { Footer: AntFooter } = Layout;

const Footer: React.FC = () => {
  return (
    <AntFooter
      style={{
        background: 'none',
        textAlign: 'center',
        padding: '16px 50px',
      }}
    >

      <div>Powered by Evan</div>
    </AntFooter>
  );
};

export default Footer;
