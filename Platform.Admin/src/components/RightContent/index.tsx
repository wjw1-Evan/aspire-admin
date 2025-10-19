import React, { useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { SelectLang as UmiSelectLang } from '@umijs/max';
import HelpModal from '../HelpModal';

export type SiderTheme = 'light' | 'dark';

export const SelectLang: React.FC = () => {
  return (
    <UmiSelectLang
      style={{
        padding: 4,
      }}
    />
  );
};

export const Question: React.FC = () => {
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <>
      <span
        onClick={() => setHelpModalOpen(true)}
        style={{
          display: 'inline-flex',
          padding: '4px',
          fontSize: '18px',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <QuestionCircleOutlined />
      </span>

      <HelpModal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </>
  );
};

