import React, { useState } from 'react';
import { Drawer, Switch, Radio, Space, Divider, Button, message, App as AntApp } from 'antd';
import { SettingOutlined, BulbOutlined, MoonOutlined } from '@ant-design/icons';
import { useModel, useIntl } from '@umijs/max';
import type { LayoutSettings } from '@/types/layout';

/**
 * 主题设置组件
 * 替代已移除的 SettingDrawer，提供主题切换和样式设置功能
 */
export const ThemeSettings: React.FC = () => {
  const intl = useIntl();
  const { message } = AntApp.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [open, setOpen] = useState(false);

  const settings = initialState?.settings || {};
  const currentTheme = settings.navTheme || 'light';

  // 切换主题
  const handleThemeChange = (theme: 'light' | 'dark' | 'realDark') => {
    const newSettings: Partial<LayoutSettings> = {
      ...settings,
      navTheme: theme,
    };

    // 保存到 localStorage
    localStorage.setItem('theme', theme === 'realDark' ? 'dark' : theme);

    // 更新 initialState
    setInitialState((preInitialState) => ({
      ...preInitialState,
      settings: {
        ...preInitialState?.settings,
        ...newSettings,
      },
    }));

    // ProLayout 会自动响应 settings 的变化，无需刷新页面
    message.success(intl.formatMessage({ id: 'app.setting.themeChangeSuccess' }));
  };

  // 切换布局模式
  const handleLayoutChange = (layout: 'side' | 'top' | 'mix') => {
    const newSettings: Partial<LayoutSettings> = {
      ...settings,
      layout,
    };

    setInitialState((preInitialState) => ({
      ...preInitialState,
      settings: {
        ...preInitialState?.settings,
        ...newSettings,
      },
    }));
  };

  // 切换内容宽度
  const handleContentWidthChange = (contentWidth: 'Fluid' | 'Fixed') => {
    const newSettings: Partial<LayoutSettings> = {
      ...settings,
      contentWidth,
    };

    setInitialState((preInitialState) => ({
      ...preInitialState,
      settings: {
        ...preInitialState?.settings,
        ...newSettings,
      },
    }));
  };

  // 切换固定 Header
  const handleFixedHeaderChange = (fixed: boolean) => {
    const newSettings: Partial<LayoutSettings> = {
      ...settings,
      fixedHeader: fixed,
    };

    setInitialState((preInitialState) => ({
      ...preInitialState,
      settings: {
        ...preInitialState?.settings,
        ...newSettings,
      },
    }));
  };

  // 切换固定侧边栏
  const handleFixedSiderbarChange = (fixed: boolean) => {
    const newSettings: Partial<LayoutSettings> = {
      ...settings,
      fixSiderbar: fixed,
    };

    setInitialState((preInitialState) => ({
      ...preInitialState,
      settings: {
        ...preInitialState?.settings,
        ...newSettings,
      },
    }));
  };

  // 切换色弱模式
  const handleColorWeakChange = (enabled: boolean) => {
    const newSettings: Partial<LayoutSettings> = {
      ...settings,
      colorWeak: enabled,
    };

    setInitialState((preInitialState) => ({
      ...preInitialState,
      settings: {
        ...preInitialState?.settings,
        ...newSettings,
      },
    }));

    // 应用色弱模式样式
    if (enabled) {
      document.body.classList.add('color-weak');
    } else {
      document.body.classList.remove('color-weak');
    }
  };

  return (
    <>
      <Button
        type="text"
        icon={<SettingOutlined />}
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center' }}
      />
      <Drawer
        title={intl.formatMessage({ id: 'app.setting.title' })}
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        size={320}
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* 整体风格设置 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 500 }}>
              {intl.formatMessage({ id: 'app.setting.pagestyle' })}
            </div>
            <Radio.Group
              value={currentTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Radio value="light">
                  <Space>
                    <BulbOutlined />
                    {intl.formatMessage({ id: 'app.setting.pagestyle.light' })}
                  </Space>
                </Radio>
                <Radio value="realDark">
                  <Space>
                    <MoonOutlined />
                    {intl.formatMessage({ id: 'app.setting.pagestyle.dark' })}
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* 导航模式 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 500 }}>
              {intl.formatMessage({ id: 'app.setting.navigationmode' })}
            </div>
            <Radio.Group
              value={settings.layout || 'mix'}
              onChange={(e) => handleLayoutChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Radio value="side">
                  {intl.formatMessage({ id: 'app.setting.sidemenu' })}
                </Radio>
                <Radio value="top">
                  {intl.formatMessage({ id: 'app.setting.topmenu' })}
                </Radio>
                <Radio value="mix">
                  {intl.formatMessage({ id: 'app.setting.mixmenu' })}
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* 内容区域宽度 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 500 }}>
              {intl.formatMessage({ id: 'app.setting.content-width' })}
            </div>
            <Radio.Group
              value={settings.contentWidth || 'Fluid'}
              onChange={(e) => handleContentWidthChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Radio value="Fixed">
                  {intl.formatMessage({ id: 'app.setting.content-width.fixed' })}
                </Radio>
                <Radio value="Fluid">
                  {intl.formatMessage({ id: 'app.setting.content-width.fluid' })}
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* 其他设置 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 500 }}>
              {intl.formatMessage({ id: 'app.setting.othersettings' })}
            </div>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{intl.formatMessage({ id: 'app.setting.fixedheader' })}</span>
                <Switch
                  checked={settings.fixedHeader !== false}
                  onChange={handleFixedHeaderChange}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{intl.formatMessage({ id: 'app.setting.fixedsidebar' })}</span>
                <Switch
                  checked={settings.fixSiderbar !== false}
                  onChange={handleFixedSiderbarChange}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{intl.formatMessage({ id: 'app.setting.weakmode' })}</span>
                <Switch
                  checked={settings.colorWeak === true}
                  onChange={handleColorWeakChange}
                />
              </div>
            </Space>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {intl.formatMessage({ id: 'app.setting.production.hint' })}
              </div>
            </>
          )}
        </Space>
      </Drawer>
    </>
  );
};
