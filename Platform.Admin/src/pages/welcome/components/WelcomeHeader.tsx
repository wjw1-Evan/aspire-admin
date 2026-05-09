import * as API from '@/types';
import React from 'react';
import { Row, Col, Avatar, Typography, Space, Tag, theme, Grid } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { UserOutlined, GlobalOutlined, CrownOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';

import { getUserAvatar } from '@/utils/avatar';
import Settings from '../../../../config/defaultSettings';
import { getGreeting } from '../utils';
import useCommonStyles from '@/hooks/useCommonStyles';

const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface WelcomeHeaderProps {
  readonly currentUser?: API.CurrentUser;
  readonly companyInfo?: any;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ currentUser, companyInfo }) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { styles } = useCommonStyles();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const avatarSize = isMobile ? 56 : 80;
  const bodyPadding = isMobile ? '16px' : '28px';

  const getUserRoleTags = () => {
    if (!currentUser?.roles) return [];

    return currentUser.roles.map((role: string) => {
      const isAdmin = role === 'admin' || role === '管理员';
      const tagColor = isAdmin ? 'red' : 'blue';
      const tagIcon = isAdmin ? <CrownOutlined /> : <UserOutlined />;

      return (
        <Tag
          key={role}
          color={tagColor}
          icon={tagIcon}
          style={{ paddingInline: 6, lineHeight: '20px', fontSize: isMobile ? 11 : 12 }}
        >
          {role}
        </Tag>
      );
    });
  };

  return (
    <ProCard
      className={styles.card}
      style={{
        background: token.colorBgContainer === '#ffffff'
          ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        border: 'none',
        color: 'white',
        borderRadius: '12px',
        marginBottom: 12,
        overflow: 'hidden',
        position: 'relative'
      }}
      styles={{ body: { padding: bodyPadding, position: 'relative', zIndex: 1 } }}
    >
      <div style={{
        position: 'absolute',
        top: '-30%',
        right: '-20%',
        width: isMobile ? '180px' : '280px',
        height: isMobile ? '180px' : '280px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%',
      }} />

      <Row align="middle" gutter={[isMobile ? 12 : 24, isMobile ? 8 : 12]}>
        <Col xs={6} sm={6} md={5} lg={4} xl={4} xxl={3}>
          <div style={{ textAlign: 'center' }}>
            <Avatar
              size={avatarSize}
              icon={<UserOutlined />}
              src={getUserAvatar(currentUser?.avatar)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'inline-block'
              }}
            />
          </div>
        </Col>
        <Col xs={18} sm={18} md={13} lg={14} xl={14} xxl={15}>
          <div className="welcome-header-text">
            <Title level={4} style={{ color: 'white', margin: 0, fontSize: isMobile ? '16px' : '20px', fontWeight: 700, letterSpacing: '-0.3px' }}>
              {getGreeting()}，{currentUser?.displayName || currentUser?.username || intl.formatMessage({ id: 'pages.welcome.user' })}！
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: isMobile ? '4px 0 8px 0' : '8px 0 14px 0', fontSize: isMobile ? '13px' : '14px' }}>
              {intl.formatMessage({ id: 'pages.welcome.welcomeText' }, { title: Settings.title })}
              {(companyInfo?.displayName || companyInfo?.name) && !isMobile && (
                <Tag style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                  {companyInfo.displayName || companyInfo.name}
                </Tag>
              )}
            </Paragraph>
            <Space wrap size={isMobile ? 6 : 10}>
              {getUserRoleTags()}
              <Tag
                color="green"
                variant="filled"
                icon={<GlobalOutlined />}
                style={{ borderRadius: '6px', border: 'none', fontSize: isMobile ? 11 : 12 }}
              >
                {intl.formatMessage({ id: 'pages.welcome.online' })}
              </Tag>
            </Space>
          </div>
        </Col>
        <Col xs={24} sm={24} md={6}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 12 : 0,
            textAlign: isMobile ? 'left' : 'center',
            background: 'rgba(255,255,255,0.1)',
            padding: isMobile ? '8px 14px' : '14px 20px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 800, lineHeight: 1.2 }}>
              {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', { day: 'numeric' })}
            </div>
            <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: 500, opacity: 0.9, marginLeft: isMobile ? 6 : 0 }}>
              {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short', weekday: 'short' })}
            </div>
          </div>
        </Col>
      </Row>
    </ProCard>
  );
};

export default WelcomeHeader;
