import {
  ApiOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  ToolOutlined,
  BuildOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import { Modal, Space, Tabs } from 'antd';
import React from 'react';
import { useIntl } from '@umijs/max';

import {
  QuickStartContent,
  VersionHistoryContent,
  FeaturesContent,
  ArchitectureContent,
  TechStackContent,
  DevelopmentContent,
} from './tabs';

interface HelpModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  const intl = useIntl();

  const tabItems = [
    {
      key: 'quick-start',
      label: (
        <span>
          <RocketOutlined /> {intl.formatMessage({ id: 'pages.help.tab.quickStart' })}
        </span>
      ),
      children: <QuickStartContent />,
    },
    {
      key: 'version-history',
      label: (
        <span>
          <CodeOutlined /> {intl.formatMessage({ id: 'pages.help.tab.versionHistory' })}
        </span>
      ),
      children: <VersionHistoryContent />,
    },
    {
      key: 'features',
      label: (
        <span>
          <ApiOutlined /> {intl.formatMessage({ id: 'pages.help.tab.features' })}
        </span>
      ),
      children: <FeaturesContent />,
    },
    {
      key: 'architecture',
      label: (
        <span>
          <ApartmentOutlined /> {intl.formatMessage({ id: 'pages.help.tab.architecture' })}
        </span>
      ),
      children: <ArchitectureContent />,
    },
    {
      key: 'tech',
      label: (
        <span>
          <ToolOutlined /> {intl.formatMessage({ id: 'pages.help.tab.tech' })}
        </span>
      ),
      children: <TechStackContent />,
    },
    {
      key: 'development',
      label: (
        <span>
          <BuildOutlined /> {intl.formatMessage({ id: 'pages.help.tab.development' })}
        </span>
      ),
      children: <DevelopmentContent />,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <QuestionCircleOutlined />
          <span>{intl.formatMessage({ id: 'pages.help.title' })}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 40 }}
      destroyOnHidden
    >
      <Tabs
        defaultActiveKey="quick-start"
        items={tabItems}
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default HelpModal;
