import { BankOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { Dropdown, Spin, App as AntApp } from 'antd';
import type { MenuProps } from 'antd';
import React, { useState, useEffect } from 'react';
import { request, useModel, useIntl } from '@umijs/max';
import { JoinCompanyModal } from '../JoinCompanyModal';
import { CreateCompanyModal } from '../CreateCompanyModal';
import styles from './index.less';

/**
 * v3.1: 企业切换器组件
 * 显示在 Header 右侧，允许用户在多个企业间切换
 */
export const CompanySwitcher: React.FC = () => {
  const intl = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = AntApp.useApp();
  const [companies, setCompanies] = useState<API.UserCompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createCompanyModalOpen, setCreateCompanyModalOpen] = useState(false);

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
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (response.success && response.data) {
        setCompanies(response.data);
      } else {
        message.error(response.errorMessage || intl.formatMessage({ id: 'pages.company.loadFailed' }));
      }
    } catch (error: any) {
      console.error('加载企业列表失败:', error);
      message.error(error.message || intl.formatMessage({ id: 'pages.company.loadFailed' }));
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
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          data: {
            targetCompanyId,
          },
        },
      );

      if (response.success && response.data) {
        message.success(intl.formatMessage({ id: 'pages.company.switchSuccess' }, { name: response.data.companyName }));

        // 更新本地存储的token（如果后端返回了新token）
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

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
        message.error(response.errorMessage || intl.formatMessage({ id: 'pages.company.switchFailed' }));
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.company.switchFailed' }));
    } finally {
      setSwitching(false);
    }
  };

  // 构建下拉菜单项
  const menuItems: MenuProps['items'] = [
    ...companies.map((company) => ({
      key: company.companyId,
      label: (
        <div className={styles.companyItem}>
          <div className={styles.companyInfo}>
            <div className={styles.companyName}>
              {company.companyName}
              {company.isPersonal && (
                <span className={styles.personalBadge}>{intl.formatMessage({ id: 'pages.company.personal' })}</span>
              )}
              {company.isAdmin && (
                <span className={styles.adminBadge}>{intl.formatMessage({ id: 'pages.company.admin' })}</span>
              )}
            </div>
            <div className={styles.companyRoles}>
              {company.roleNames.join(intl.formatMessage({ id: 'pages.company.roleSeparator' })) || intl.formatMessage({ id: 'pages.company.noRole' })}
            </div>
          </div>
          {company.isCurrent && <CheckOutlined className={styles.checkIcon} />}
        </div>
      ),
      onClick: () => handleSwitch(company.companyId),
    })),
    {
      type: 'divider',
    },
    {
      key: 'create-company',
      label: (
        <div className={styles.joinCompany}>
          <PlusOutlined /> {intl.formatMessage({ id: 'pages.company.createNew' })}
        </div>
      ),
      onClick: () => {
        setCreateCompanyModalOpen(true);
      },
    },
    {
      key: 'join-company',
      label: (
        <div className={styles.joinCompany}>
          <PlusOutlined /> {intl.formatMessage({ id: 'pages.company.joinNew' })}
        </div>
      ),
      onClick: () => {
        setJoinModalOpen(true);
      },
    },
  ];

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
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['hover']}
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

      <JoinCompanyModal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onSuccess={() => {
          // 申请成功后刷新企业列表
          loadCompanies();
        }}
      />

      <CreateCompanyModal
        open={createCompanyModalOpen}
        onClose={() => setCreateCompanyModalOpen(false)}
        onSuccess={() => {
          // 创建成功后刷新企业列表
          loadCompanies();
        }}
      />
    </>
  );
};
