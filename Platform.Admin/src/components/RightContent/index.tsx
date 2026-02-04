import React, { useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import HelpModal from '../HelpModal';
import styles from './index.less';

export type SiderTheme = 'light' | 'dark';

export const Question: React.FC = () => {
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <>
      <span
        onClick={() => setHelpModalOpen(true)}
        className={styles.headerActionButton}
      >
        <QuestionCircleOutlined />
      </span>

      <HelpModal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </>
  );
};
