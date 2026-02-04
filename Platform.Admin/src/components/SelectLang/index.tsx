import React from 'react';
import { GlobalOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { setLocale, getLocale } from '@umijs/max';
import styles from './index.less';

// 支持的语言列表 (18种语言)
const locales = [
    { label: '简体中文', value: 'zh-CN', icon: '🇨🇳' },
    { label: '繁體中文', value: 'zh-TW', icon: '🇹🇼' },
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

    const currentLocaleInfo = locales.find((locale) => locale.value === currentLocale);

    return (
        <Dropdown
            menu={{
                items: menuItems,
                onClick: handleMenuClick,
                selectedKeys: [currentLocale],
            }}
            placement="bottomRight"
            trigger={['hover']}
        >
            <span className={styles.headerActionButton}>
                
                {currentLocaleInfo && (
                    <span className={styles.flagWrapper}>
                        {currentLocaleInfo.icon}
                    </span>
                )}
            </span>
        </Dropdown>
    );
};

export default SelectLang;
