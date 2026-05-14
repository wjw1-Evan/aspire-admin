import { BankOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { request, useIntl, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App as AntApp, Dropdown, Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { useCallback, useEffect, useState } from 'react';
import type { ApiResponse, SwitchCompanyResult, UserCompanyItem } from '@/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { CreateCompanyModal } from '../CreateCompanyModal';

const useStyles = createStyles(({ css }) => ({
  companySwitcher: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    margin: 0 4px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 18px;
    color: inherit;
    transition: all 0.3s;
    line-height: 1;

    &:hover {
      background-color: rgba(0, 0, 0, 0.06);
    }

    &:active {
      background-color: rgba(0, 0, 0, 0.1);
    }
  `,
  icon: css`
    margin-right: 8px;
    font-size: 16px;
  `,
  companyName: css`
    font-size: 14px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  companyItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    min-width: 250px;
  `,
  companyInfo: css`
    flex: 1;
  `,
  personalBadge: css`
    margin-left: 8px;
    padding: 0 6px;
    font-size: 12px;
    background: #e6f7ff;
    color: #1890ff;
    border-radius: 2px;
  `,
  adminBadge: css`
    margin-left: 8px;
    padding: 0 6px;
    font-size: 12px;
    background: #fff7e6;
    color: #fa8c16;
    border-radius: 2px;
  `,
  companyRoles: css`
    font-size: 12px;
    color: #666;
  `,
  checkIcon: css`
    margin-left: 12px;
    color: #52c41a;
    font-size: 16px;
  `,
  joinCompany: css`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #1890ff;
    font-weight: 500;
  `,
}));

/**
 * v3.1: 企业切换器组件
 * 显示在 Header 右侧，允许用户在多个企业间切换
 */
export const CompanySwitcher: React.FC = () => {
  const { styles } = useStyles();
  const intl = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = AntApp.useApp();
  const [companies, setCompanies] = useState<UserCompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [createCompanyModalOpen, setCreateCompanyModalOpen] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await request<ApiResponse<UserCompanyItem[]>>('/apiservice/api/company/my-companies', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.success && response.data) {
        setCompanies(response.data);
      } else {
        message.error(getErrorMessage(response, 'pages.company.loadFailed'));
      }
    } catch (error: any) {
      console.error('加载企业列表失败:', error);
      message.error(error.message || intl.formatMessage({ id: 'pages.company.loadFailed' }));
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载用户的企业列表
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleSwitch = async (targetCompanyId: string) => {
    // 如果是当前企业，不执行切换
    const currentCompany = companies.find((c) => c.isCurrent);
    if (currentCompany?.companyId === targetCompanyId) {
      return;
    }

    setSwitching(true);
    try {
      const response = await request<ApiResponse<SwitchCompanyResult>>('/apiservice/api/company/switch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        data: {
          targetCompanyId,
        },
      });

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
        message.error(getErrorMessage(response, 'pages.company.switchFailed'));
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
              {(company.roleNames || []).join(intl.formatMessage({ id: 'pages.company.roleSeparator' })) ||
                intl.formatMessage({ id: 'pages.company.noRole' })}
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
      <Dropdown menu={{ items: menuItems }} trigger={['hover']} placement="bottomRight" disabled={switching}>
        <div className={styles.companySwitcher}>
          <BankOutlined className={styles.icon} />
          <span className={styles.companyName}>{currentCompany.companyName}</span>
          {switching && <Spin size="small" style={{ marginLeft: 8 }} />}
        </div>
      </Dropdown>

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
