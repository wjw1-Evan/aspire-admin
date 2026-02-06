import React from 'react';
import { Card, Row, Col, Avatar, Typography, Space, Tag, theme } from 'antd';
import { UserOutlined, GlobalOutlined, CrownOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';

import { getUserAvatar } from '@/utils/avatar';
import Settings from '../../../../config/defaultSettings';
import { getGreeting } from '../utils';
import useCommonStyles from '@/hooks/useCommonStyles';

const { Title, Paragraph } = Typography;

interface WelcomeHeaderProps {
    readonly currentUser?: API.CurrentUser;
    readonly companyInfo?: any;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ currentUser, companyInfo }) => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const { styles } = useCommonStyles();

    const getUserRoleTags = () => {
        if (!currentUser?.roles) return [];

        return currentUser.roles.map(role => {
            const isAdmin = role === 'admin' || role === '管理员';
            const tagColor = isAdmin ? 'red' : 'blue';
            const tagIcon = isAdmin ? <CrownOutlined /> : <UserOutlined />;

            return (
                <Tag
                    key={role}
                    color={tagColor}
                    icon={tagIcon}
                    style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}
                >
                    {role}
                </Tag>
            );
        });
    };

    return (
        <Card
            className={styles.card}
            style={{
                background: token.colorBgContainer === '#ffffff'
                    ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                border: 'none',
                color: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative'
            }}
            styles={{ body: { padding: '32px', position: 'relative', zIndex: 1 } }}
        >
            {/* Decorative elements */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
                borderRadius: '50%',
            }} />

            <Row align="middle" gutter={32}>
                <Col>
                    <Avatar
                        size={88}
                        icon={<UserOutlined />}
                        src={getUserAvatar(currentUser?.avatar)}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            border: '4px solid rgba(255,255,255,0.3)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }}
                    />
                </Col>
                <Col flex={1}>
                    <Title level={1} style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: 700 }}>
                        {getGreeting(intl)}，{currentUser?.name || currentUser?.userid || intl.formatMessage({ id: 'pages.welcome.user' })}！
                    </Title>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '12px 0 20px 0', fontSize: '16px' }}>
                        {intl.formatMessage({ id: 'pages.welcome.welcomeText' }, { title: Settings.title })}
                        {(companyInfo?.displayName || companyInfo?.name) && (
                            <Tag style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                                {companyInfo.displayName || companyInfo.name}
                            </Tag>
                        )}
                    </Paragraph>
                    <Space wrap size={12}>
                        {getUserRoleTags()}
                        <Tag
                            color="green"
                            variant="filled"
                            icon={<GlobalOutlined />}
                            style={{ borderRadius: '6px', border: 'none' }}
                        >
                            {intl.formatMessage({ id: 'pages.welcome.online' })}
                        </Tag>
                    </Space>
                </Col>
                <Col>
                    <div style={{
                        textAlign: 'right',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '16px 24px',
                        borderRadius: '16px',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 800 }}>
                            {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
                                day: 'numeric'
                            })}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 500, opacity: 0.9 }}>
                            {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short', weekday: 'short' })}
                        </div>
                    </div>
                </Col>
            </Row>
        </Card>
    );
};

export default WelcomeHeader;
