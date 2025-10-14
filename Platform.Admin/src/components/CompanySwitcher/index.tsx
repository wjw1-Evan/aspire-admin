import { BankOutlined, CheckOutlined, SwapOutlined } from '@ant-design/icons';
import { Dropdown, Spin, App as AntApp } from 'antd';
import type { MenuProps } from 'antd';
import React, { useState, useEffect } from 'react';
import { request, useModel } from '@umijs/max';
import styles from './index.less';

/**
 * v3.1: 企业切换器组件
 * 显示在 Header 右侧，允许用户在多个企业间切换
 */
export const CompanySwitcher: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = AntApp.useApp();
  const [companies, setCompanies] = useState<API.UserCompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  // 加载用户的企业列表
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await request<API.ApiResponse<API.UserCompanyItem[]>>(
        '/api/company/my-companies',
        {
          method: 'GET',
        }
      );

      if (response.success && response.data) {
        setCompanies(response.data);
      }
    } catch (error) {
      console.error('加载企业列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (targetCompanyId: string) => {
    // 如果是当前企业，不执行切换
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
        }
      );

      if (response.success && response.data) {
        message.success(`已切换到：${response.data.companyName}`);

        // 重新加载用户信息
        if (initialState?.fetchUserInfo) {
          const userInfo = await initialState.fetchUserInfo();
          setInitialState((s: any) => ({
            ...s,
            currentUser: userInfo,
          }));
        }

        // 刷新企业列表
        await loadCompanies();

        // 刷新页面以加载新企业的数据
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        message.error(response.errorMessage || '切换失败');
      }
    } catch (error: any) {
      message.error(error.message || '切换企业失败');
    } finally {
      setSwitching(false);
    }
  };

  // 构建下拉菜单项
  const menuItems: MenuProps['items'] = companies.map((company) => ({
    key: company.companyId,
    label: (
      <div className={styles.companyItem}>
        <div className={styles.companyInfo}>
          <div className={styles.companyName}>
            {company.companyName}
            {company.isPersonal && (
              <span className={styles.personalBadge}>个人</span>
            )}
            {company.isAdmin && (
              <span className={styles.adminBadge}>管理员</span>
            )}
          </div>
          <div className={styles.companyRoles}>
            {company.roleNames.join('、') || '无角色'}
          </div>
        </div>
        {company.isCurrent && (
          <CheckOutlined className={styles.checkIcon} />
        )}
      </div>
    ),
    onClick: () => handleSwitch(company.companyId),
  }));

  // 添加搜索企业选项
  menuItems.push({
    type: 'divider',
  });
  menuItems.push({
    key: 'search',
    label: (
      <div className={styles.searchCompany}>
        <SwapOutlined /> 加入其他企业
      </div>
    ),
    onClick: () => {
      // 跳转到企业搜索页面
      window.location.href = '/company/search';
    },
  });

  // 当前企业信息
  const currentCompany = companies.find((c) => c.isCurrent);

  if (loading) {
    return (
      <div className={styles.companySwitcher}>
        <Spin size="small" />
      </div>
    );
  }

  if (!currentCompany) {
    return null;
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      placement="bottomRight"
      disabled={switching}
    >
      <div className={styles.companySwitcher}>
        <BankOutlined className={styles.icon} />
        <span className={styles.companyName}>
          {currentCompany.companyName}
        </span>
        {switching && <Spin size="small" style={{ marginLeft: 8 }} />}
      </div>
    </Dropdown>
  );
};

