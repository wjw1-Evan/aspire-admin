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
      <div style={{ marginBottom: 8 }}>
        <a
          href="https://www.rong-zhong.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginRight: 16 }}
        >
          天津融众信息技术有限公司
        </a>
        <a
          href="https://github.com/wjw1-Evan/aspire-admin"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubOutlined />
        </a>
      </div>
      <div>Powered by Evan</div>
    </AntFooter>
  );
};

export default Footer;
