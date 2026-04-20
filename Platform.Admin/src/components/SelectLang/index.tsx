import React from 'react';
import HeaderDropdown from '@/components/HeaderDropdown';
import type { MenuProps } from 'antd';
import { setLocale, getLocale } from '@umijs/max';
import styles from './index.less';

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
                {currentLocaleInfo && (
                    <span className={styles.flagWrapper}>
                        {currentLocaleInfo.icon}
                    </span>
                )}
            </span>
        </HeaderDropdown>
    );
};

export default SelectLang;
