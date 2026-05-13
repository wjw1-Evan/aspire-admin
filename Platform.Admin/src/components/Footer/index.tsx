import { Layout } from 'antd';
import React from 'react';

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
