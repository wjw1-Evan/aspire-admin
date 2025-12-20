import {
  LogoutOutlined,
  UserOutlined,
  LockOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { history, useModel, useIntl } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin, Avatar } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { outLogin } from '@/services/ant-design-pro/api';
import { tokenUtils } from '@/utils/token';
import { getUserAvatar } from '@/utils/avatar';
import HeaderDropdown from '../HeaderDropdown';
import HelpModal from '../HelpModal';
import { ThemeSettingsDrawer } from './ThemeSettingsDrawer';

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar
        size="small"
        src={getUserAvatar(currentUser?.avatar)}
        icon={<UserOutlined />}
      />
      <span className="anticon">{currentUser?.name}</span>
    </span>
  );
};

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      display: 'flex',
      height: '48px',
      marginLeft: 'auto',
      overflow: 'hidden',
      alignItems: 'center',
     
     
      borderRadius: token.borderRadius,
     
    },
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
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

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
        {children}
      </HeaderDropdown>
      <ThemeSettingsDrawer
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
      />
      <HelpModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </>
  );
};
