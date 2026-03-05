import {
  LogoutOutlined,
  UserOutlined,
  LockOutlined,
  QuestionCircleOutlined,
  BankOutlined,
  CheckOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { history, useModel, useIntl, request } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin, Avatar, App as AntApp, Tag } from 'antd';
import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { outLogin } from '@/services/ant-design-pro/api';
import { tokenUtils } from '@/utils/token';
import HeaderDropdown from '../HeaderDropdown';
import HelpModal from '../HelpModal';
import { ThemeSettingsDrawer } from './ThemeSettingsDrawer';
import { JoinCompanyModal } from '../JoinCompanyModal';
import { CreateCompanyModal } from '../CreateCompanyModal';
import headerStyles from './index.less';

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  return <span>{currentUser?.name}</span>;
};

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const intl = useIntl();
  const { message } = AntApp.useApp();

  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createCompanyModalOpen, setCreateCompanyModalOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const loginOut = async () => {
    await outLogin();
    tokenUtils.removeToken();
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    const searchParams = new URLSearchParams({
      redirect: pathname + search,
    });
    const redirect = urlParams.get('redirect');
    if (window.location.pathname !== '/user/login' && !redirect) {
      history.replace({
        pathname: '/user/login',
        search: searchParams.toString(),
      });
    }
  };

  const loadCompanies = useCallback(async () => {
    if (!currentUser) return;
    setCompaniesLoading(true);
    try {
      const res = await request('/api/company/my-companies');
      if (res.success) {
        setCompanies(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompaniesLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleSwitchCompany = async (targetCompanyId: string) => {
    const currentCompany = companies.find((c) => c.isCurrent);
    if (currentCompany?.companyId === targetCompanyId) {
      return;
    }

    try {
      const response = await request('/api/company/switch', {
        method: 'POST',
        data: { targetCompanyId },
      });

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.company.switchSuccess' }));
        if (initialState?.fetchUserInfo) {
          const userInfo = await initialState.fetchUserInfo();
          setInitialState((s: any) => ({
            ...s,
            currentUser: userInfo,
          }));
        }
        window.location.reload();
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.company.switchFailed' }));
    }
  };

  const onMenuClick: MenuProps['onClick'] = (event) => {
    const { key } = event;
    if (key === 'logout') {
      flushSync(() => {
        setInitialState((s) => ({ ...s, currentUser: undefined }));
      });
      loginOut();
      return;
    }
    if (key === 'change-password') {
      history.push('/user/change-password');
      return;
    }
    if (key === 'center') {
      history.push('/account/center');
      return;
    }
    if (key === 'help') {
      setHelpModalOpen(true);
      return;
    }
    if (key === 'create-company') {
      setCreateCompanyModalOpen(true);
      return;
    }
    if (key === 'join-company') {
      setJoinModalOpen(true);
      return;
    }
    if (key === 'settings') {
      setSettingsDrawerOpen(true);
      return;
    }

    if (companies.some((company) => company.companyId === key)) {
      handleSwitchCompany(key);
      return;
    }

    history.push(`/account/${key}`);
  };

  if (!currentUser?.name) {
    return (
      <span className={headerStyles.headerActionButton}>
        <Spin size="small" />
      </span>
    );
  }

  const companyMenuItems: MenuProps['items'] = [
    ...companies.map((company) => ({
      key: company.companyId,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', minWidth: 250 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {company.companyName}
              {company.isPersonal && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {intl.formatMessage({ id: 'pages.company.personal' })}
                </Tag>
              )}
              {company.isAdmin && (
                <Tag color="orange" style={{ marginLeft: 8 }}>
                  {intl.formatMessage({ id: 'pages.company.admin' })}
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ant-color-text-description)' }}>
              {company.roleNames.join(intl.formatMessage({ id: 'pages.company.roleSeparator' })) || intl.formatMessage({ id: 'pages.company.noRole' })}
            </div>
          </div>
          {company.isCurrent && <CheckOutlined style={{ marginLeft: 12, color: 'var(--ant-color-success)', fontSize: 16 }} />}
        </div>
      ),
    })),
    {
      type: 'divider' as const,
    },
    {
      key: 'create-company',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ant-color-primary)', fontWeight: 500 }}>
          <PlusOutlined /> {intl.formatMessage({ id: 'pages.company.createNew' })}
        </div>
      ),
    },
    {
      key: 'join-company',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ant-color-primary)', fontWeight: 500 }}>
          <PlusOutlined /> {intl.formatMessage({ id: 'pages.company.joinNew' })}
        </div>
      ),
    },
  ];

  const menuItems: MenuProps['items'] = [
    ...(menu
      ? [
        {
          key: 'center',
          icon: <UserOutlined />,
          label: intl.formatMessage({ id: 'menu.account.center' }),
        },
        {
          key: 'change-password',
          icon: <LockOutlined />,
          label: intl.formatMessage({ id: 'menu.account.changePassword' }),
        },
        {
          type: 'divider' as const,
        },
      ]
      : []),
    {
      key: 'company',
      icon: <BankOutlined />,
      label: intl.formatMessage({ id: 'menu.account.company', defaultMessage: '切换企业' }),
      children: companiesLoading ? [{ key: 'loading', label: <Spin size="small" />, disabled: true }] : companyMenuItems,
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: intl.formatMessage({ id: 'menu.account.help' }),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: intl.formatMessage({ id: 'menu.account.settings' }),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: intl.formatMessage({ id: 'menu.account.logout' }),
    },
  ];

  return (
    <>
      <HeaderDropdown
        placement="bottomRight"
        styles={{ root: { minWidth: 200 } }}
        menu={{
          selectedKeys: [],
          onClick: onMenuClick,
          items: menuItems,
        }}
      >
        <span className={headerStyles.headerActionButton}>
          {children}
        </span>
      </HeaderDropdown>
      <ThemeSettingsDrawer
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
      />
      <HelpModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
      <JoinCompanyModal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onSuccess={loadCompanies}
      />
      <CreateCompanyModal
        open={createCompanyModalOpen}
        onClose={() => setCreateCompanyModalOpen(false)}
        onSuccess={async () => {
          if (initialState?.fetchUserInfo) {
            const userInfo = await initialState.fetchUserInfo();
            setInitialState((s: any) => ({
              ...s,
              currentUser: userInfo,
            }));
          }
          await loadCompanies();
        }}
      />
    </>
  );
};
