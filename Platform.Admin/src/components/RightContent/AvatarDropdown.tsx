import {
  LogoutOutlined,
  UserOutlined,
  LockOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  BankOutlined,
  CheckOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { history, useModel, useIntl, request } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin, Avatar, App as AntApp } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { outLogin } from '@/services/ant-design-pro/api';
import { tokenUtils } from '@/utils/token';
import { getUserAvatar } from '@/utils/avatar';
import HeaderDropdown from '../HeaderDropdown';
import HelpModal from '../HelpModal';
import { ThemeSettingsDrawer } from './ThemeSettingsDrawer';
import { JoinCompanyModal } from '../JoinCompanyModal';
import { CreateCompanyModal } from '../CreateCompanyModal';



export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  return <span className="anticon">{currentUser?.name}</span>;
};

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '44px',
      padding: '0 12px',
      margin: '0 4px',
      cursor: 'pointer',
      borderRadius: '22px', // 药丸形以对齐圆形按钮
      transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
      lineHeight: 1,
      background: '#ffffff',
      border: '1px solid #e8e8e8',
      color: '#333',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',

      '&:hover': {
        background: '#fafafa',
        borderColor: '#1890ff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px) scale(1.02)',
      },

      '&:active': {
        transform: 'scale(0.98)',
      },
    },
    name: {
      marginLeft: '8px',
      fontWeight: '500',
    }
  };
});

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  /**
   * 退出登录，并且将当前的 url 保存
   */
  const loginOut = async () => {
    await outLogin();
    // 清除本地存储的 token
    tokenUtils.removeToken();
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    const searchParams = new URLSearchParams({
      redirect: pathname + search,
    });
    /** 此方法会跳转到 redirect 参数所在的位置 */
    const redirect = urlParams.get('redirect');
    // Note: There may be security issues, please note
    if (window.location.pathname !== '/user/login' && !redirect) {
      history.replace({
        pathname: '/user/login',
        search: searchParams.toString(),
      });
    }
  };
  const { styles } = useStyles();

  const { initialState, setInitialState } = useModel('@@initialState');
  const intl = useIntl();
  const { message } = AntApp.useApp();
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [companies, setCompanies] = useState<API.UserCompanyItem[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createCompanyModalOpen, setCreateCompanyModalOpen] = useState(false);

  // 加载用户的企业列表
  const loadCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      // 添加时间戳参数防止缓存
      const response = await request<API.ApiResponse<API.UserCompanyItem[]>>(
        '/api/company/my-companies',
        {
          method: 'GET',
          params: {
            _t: Date.now(),
          },
        },
      );

      if (response.success && response.data) {
        // 确保更新状态
        setCompanies(response.data);

      } else {
        message.error(response.errorMessage || intl.formatMessage({ id: 'pages.company.loadFailed' }));
      }
    } catch (error: any) {
      console.error('加载企业列表失败:', error);
      message.error(error.message || intl.formatMessage({ id: 'pages.company.loadFailed' }));
    } finally {
      setCompaniesLoading(false);
    }
  }, [intl, message]);

  // 在组件挂载时加载企业列表
  useEffect(() => {
    if (initialState?.currentUser) {
      loadCompanies();
    }
  }, [initialState?.currentUser, loadCompanies]);

  // 切换企业
  const handleSwitchCompany = async (targetCompanyId: string) => {
    const currentCompany = companies.find((c) => c.isCurrent);
    if (currentCompany?.companyId === targetCompanyId) {
      return;
    }

    setSwitching(true);
    try {
      const response = await request<API.ApiResponse<API.SwitchCompanyResult>>(
        '/api/company/switch',
        {
          method: 'POST',
          data: {
            targetCompanyId,
          },
        },
      );

      if (response.success && response.data) {
        message.success(
          intl.formatMessage({ id: 'pages.company.switchSuccess' }, { name: response.data.companyName })
        );

        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        if (initialState?.fetchUserInfo) {
          const userInfo = await initialState.fetchUserInfo();
          setInitialState((s: any) => ({
            ...s,
            currentUser: userInfo,
          }));
        }

        await loadCompanies();

        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        message.error(response.errorMessage || intl.formatMessage({ id: 'pages.company.switchFailed' }));
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.company.switchFailed' }));
    } finally {
      setSwitching(false);
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
    if (key === 'settings') {
      setSettingsDrawerOpen(true);
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

    // 处理企业切换
    if (companies.some((company) => company.companyId === key)) {
      handleSwitchCompany(key);
      return;
    }
    history.push(`/account/${key}`);
  };

  const loading = (
    <span className={styles.action}>
      <Spin
        size="small"
        style={{
          marginLeft: 8,
          marginRight: 8,
        }}
      />
    </span>
  );

  if (!initialState) {
    return loading;
  }

  const { currentUser } = initialState;

  if (!currentUser?.name) {
    return loading;
  }

  // 构建企业切换子菜单项
  const companyMenuItems: MenuProps['items'] = [
    ...companies.map((company) => ({
      key: company.companyId,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', minWidth: 250 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {company.companyName}
              {company.isPersonal && (
                <span style={{ marginLeft: 8, padding: '0 6px', fontSize: 12, background: '#e6f7ff', color: '#1890ff', borderRadius: 2 }}>
                  {intl.formatMessage({ id: 'pages.company.personal' })}
                </span>
              )}
              {company.isAdmin && (
                <span style={{ marginLeft: 8, padding: '0 6px', fontSize: 12, background: '#fff7e6', color: '#fa8c16', borderRadius: 2 }}>
                  {intl.formatMessage({ id: 'pages.company.admin' })}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {company.roleNames.join(intl.formatMessage({ id: 'pages.company.roleSeparator' })) || intl.formatMessage({ id: 'pages.company.noRole' })}
            </div>
          </div>
          {company.isCurrent && <CheckOutlined style={{ marginLeft: 12, color: '#52c41a', fontSize: 16 }} />}
        </div>
      ),
    })),
    {
      type: 'divider' as const,
    },
    {
      key: 'create-company',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1890ff', fontWeight: 500 }}>
          <PlusOutlined /> {intl.formatMessage({ id: 'pages.company.createNew' })}
        </div>
      ),
    },
    {
      key: 'join-company',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1890ff', fontWeight: 500 }}>
          <PlusOutlined /> {intl.formatMessage({ id: 'pages.company.joinNew' })}
        </div>
      ),
    },
  ];

  const menuItems = [
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
      key: 'settings',
      icon: <SettingOutlined />,
      label: intl.formatMessage({ id: 'menu.account.settings' }),
    },

    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: intl.formatMessage({ id: 'menu.account.help' }),
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
        menu={{
          selectedKeys: [],
          onClick: onMenuClick,
          items: menuItems,
        }}
      >
        <span className={styles.action}>
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
        onSuccess={async () => {
          // 加入企业成功后刷新企业列表
          await loadCompanies();
        }}
      />
      <CreateCompanyModal
        open={createCompanyModalOpen}
        onClose={() => setCreateCompanyModalOpen(false)}
        onSuccess={async () => {
          // 创建企业成功后，刷新用户信息和企业列表
          // 因为新创建的企业会被设置为当前企业
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
