import { getLocale, setLocale } from '@umijs/max';
import type { MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import HeaderDropdown from '@/components/HeaderDropdown';

const useStyles = createStyles(({ css }) => ({
  headerActionButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    margin: 0 4px;
    cursor: pointer;
    border-radius: 50%;
    font-size: 20px;
    color: #333;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    line-height: 1;
    background: #ffffff;
    border: 1px solid #e8e8e8;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    &:hover {
      background: #fafafa;
      border-color: #1890ff;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px) scale(1.08);

      .flagWrapper {
        transform: scale(1.15) rotate(5deg);
      }
    }

    &:active {
      transform: scale(0.95);
    }
  `,
  flagWrapper: css`
    font-size: 20px;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", EmojiSymbols, sans-serif !important;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    overflow: hidden;
    transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  `,
}));

// 支持的语言列表 (18种语言)
const locales = [
  { label: '简体中文', value: 'zh-CN', icon: '🇨🇳' },
  { label: '繁體中文', value: 'zh-TW', icon: '🇨🇳' },
  { label: 'English', value: 'en-US', icon: '🇺🇸' },
  { label: '日本語', value: 'ja-JP', icon: '🇯🇵' },
  { label: '한국어', value: 'ko-KR', icon: '🇰🇷' },
  { label: 'Bahasa Indonesia', value: 'id-ID', icon: '🇮🇩' },
  { label: 'Português', value: 'pt-BR', icon: '🇧🇷' },
  { label: 'Español', value: 'es-ES', icon: '🇪🇸' },
  { label: 'Français', value: 'fr-FR', icon: '🇫🇷' },
  { label: 'Deutsch', value: 'de-DE', icon: '🇩🇪' },
  { label: 'Italiano', value: 'it-IT', icon: '🇮🇹' },
  { label: 'Русский', value: 'ru-RU', icon: '🇷🇺' },
  { label: 'العربية', value: 'ar-EG', icon: '🇪🇬' },
  { label: 'ไทย', value: 'th-TH', icon: '🇹🇭' },
  { label: 'Tiếng Việt', value: 'vi-VN', icon: '🇻🇳' },
  { label: 'বাংলা', value: 'bn-BD', icon: '🇧🇩' },
  { label: 'فارسی', value: 'fa-IR', icon: '🇮🇷' },
  { label: 'Türkçe', value: 'tr-TR', icon: '🇹🇷' },
];

const SelectLang: React.FC = () => {
  const { styles } = useStyles();
  const currentLocale = getLocale();

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    setLocale(key as string, false);
  };

  const menuItems: MenuProps['items'] = locales.map((locale) => ({
    key: locale.value,
    label: (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="menuIcon">{locale.icon}</span>
        <span className="menuLabel">{locale.label}</span>
      </div>
    ),
  }));

  // 为当前语言找到匹配的配置逻辑：
  // 1. 精确匹配 (如 en-US)
  // 2. 前缀匹配 (如 en-GB 匹配 en-US)
  // 3. 浏览器语言匹配 (navigator.language)
  // 4. 默认 fallback (locales[0])
  const currentLocaleInfo =
    locales.find((l) => l.value === currentLocale) ||
    locales.find((l) => l.value.split('-')[0] === currentLocale.split('-')[0]) ||
    locales.find((l) => l.value === navigator.language) ||
    locales.find((l) => l.value.split('-')[0] === navigator.language.split('-')[0]) ||
    locales[0];

  return (
    <HeaderDropdown
      menu={{
        items: menuItems,
        onClick: handleMenuClick,
        selectedKeys: [currentLocaleInfo?.value || currentLocale],
      }}
      placement="bottomRight"
      trigger={['click']}
    >
      <span className={styles.headerActionButton}>
        {currentLocaleInfo && <span className={styles.flagWrapper}>{currentLocaleInfo.icon}</span>}
      </span>
    </HeaderDropdown>
  );
};

export default SelectLang;
