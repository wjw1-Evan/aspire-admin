import React, { useState } from 'react';
import { QuestionCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useIntl, setLocale, getLocale } from '@umijs/max';
import HelpModal from '../HelpModal';

export type SiderTheme = 'light' | 'dark';

// 支持的语言列表
const locales = [
  { label: '简体中文', value: 'zh-CN', icon: '🇨🇳' },
  { label: '繁體中文', value: 'zh-TW', icon: '🇹🇼' },
  { label: 'English', value: 'en-US', icon: '🇺🇸' },
  { label: '日本語', value: 'ja-JP', icon: '🇯🇵' },
  { label: 'Bahasa Indonesia', value: 'id-ID', icon: '🇮🇩' },
  { label: 'Português', value: 'pt-BR', icon: '🇧🇷' },
  { label: 'বাংলা', value: 'bn-BD', icon: '🇧🇩' },
  { label: 'فارسی', value: 'fa-IR', icon: '🇮🇷' },
];

export const SelectLang: React.FC = () => {
  const intl = useIntl();
  const currentLocale = getLocale();

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    setLocale(key as string, false);
  };

  const menuItems: MenuProps['items'] = locales.map((locale) => ({
    key: locale.value,
    label: (
      <span>
        <span style={{ marginRight: 8 }}>{locale.icon}</span>
        {locale.label}
      </span>
    ),
    icon: currentLocale === locale.value ? '✓' : null,
  }));

  const currentLocaleInfo = locales.find((locale) => locale.value === currentLocale);

  return (
    <Dropdown
      menu={{
        items: menuItems,
        onClick: handleMenuClick,
        selectedKeys: [currentLocale],
      }}
      placement="bottomRight"
      trigger={['click']}
      // 使用 classNames 替代已弃用的 overlayClassName
      classNames={{
        root: undefined,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px',
          cursor: 'pointer',
          fontSize: '18px',
        }}
      >
        <GlobalOutlined />
        {currentLocaleInfo && (
          <span style={{ marginLeft: 4, fontSize: '14px' }}>
            {currentLocaleInfo.icon}
          </span>
        )}
      </span>
    </Dropdown>
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

