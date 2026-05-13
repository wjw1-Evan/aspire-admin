import { QuestionCircleOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import HelpModal from '../HelpModal';
import { useHeaderStyles } from './styles';

export type SiderTheme = 'light' | 'dark';

export const Question: React.FC = () => {
  const { styles } = useHeaderStyles();
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <>
      <span onClick={() => setHelpModalOpen(true)} className={styles.headerActionButton}>
        <QuestionCircleOutlined />
      </span>

      <HelpModal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </>
  );
};
