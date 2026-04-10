import { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Spin, Row, Col, Tag, Space, Button } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import {
  EditOutlined,
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useIntl, useModel } from '@umijs/max';
import { getCurrentCompany, getCompanyStatistics } from '@/services/company';
import EditCompanyModal from './components/EditCompanyModal';
import type { Company, CompanyStatistics } from '@/types';
import { StatCard } from '@/components';
import dayjs from 'dayjs';

export default function CompanySettings() {
  const intl = useIntl();
  const [company, setCompany] = useState<Company | null>(null);
  const [statistics, setStatistics] = useState<CompanyStatistics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const { initialState, setInitialState } = useModel('@@initialState');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companyRes, statsRes] = await Promise.all([
        getCurrentCompany(),
        getCompanyStatistics(),
      ]);

      if (companyRes.success && companyRes.data) {
        setCompany(companyRes.data);
      }

      if (statsRes.success && statsRes.data) {
        setStatistics(statsRes.data);
      }
      // 错误由全局错误处理统一处理，这里不需要 catch
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = async () => {
    setEditModalVisible(false);
    fetchData();

    // ✅ 关键：更新企业信息后，刷新全局 initialState 里的 currentUser 信息
    // 这样顶部 Header 里的 System Display Name 才会立即更新
    if (initialState?.fetchUserInfo) {
      const currentUser = await initialState.fetchUserInfo();
      if (currentUser) {
        setInitialState((s) => ({
          ...s,
          currentUser,
        }));
      }
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Spin
          size="large"
          tip={intl.formatMessage({ id: 'pages.companySettings.loading' })}
          style={{ display: 'block', padding: 100 }}
        >
          <div style={{ minHeight: 200 }} />
        </Spin>
      </PageContainer>
    );
  }

  if (!company) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <p>{intl.formatMessage({ id: 'pages.companySettings.companyNotFound' })}</p>
          </div>
        </Card>
      </PageContainer>
    );
  }


  return (
    <PageContainer>
      {/* 企业统计：使用 StatCard 统一风格 */}
      {statistics && (
        <Card
          title={intl.formatMessage({ id: 'pages.companySettings.statistics' })}
          style={{ marginBottom: 16, borderRadius: 12 }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={6} md={3} lg={3}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalUsers' })}
                value={`${statistics.totalUsers} / ${statistics.maxUsers}`}
                icon={<UserOutlined />}
                color="#3f8600"
              />
            </Col>
            <Col xs={12} sm={6} md={3} lg={3}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.activeUsers' })}
                value={statistics.activeUsers}
                icon={<UserOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={12} sm={6} md={3} lg={3}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalRoles' })}
                value={statistics.totalRoles ?? 0}
                icon={<TeamOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={12} sm={6} md={3} lg={3}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalMenus' })}
                value={statistics.totalMenus ?? 0}
                icon={<MenuOutlined />}
                color="#1890ff"
              />
            </Col>
       
            <Col xs={12} sm={6} md={3} lg={3}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalPermissions' })}
                value={statistics.totalMenus ?? 0}
                icon={<SafetyOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={12} sm={6} md={3} lg={3}>
              <Card
                size="small"
                styles={{ body: { padding: '10px 12px' } }}
                style={{ borderRadius: 12 }}
              >
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#00000073' }}>
                    {intl.formatMessage({ id: 'pages.companySettings.statistics.companyStatus' })}
                  </span>
                </div>
                <div>
                  {statistics.isExpired ? (
                    <Tag color="red">
                      {intl.formatMessage({ id: 'pages.companySettings.statistics.expired' })}
                    </Tag>
                  ) : company.isActive ? (
                    <Tag color="green">
                      {intl.formatMessage({ id: 'pages.companySettings.statistics.normal' })}
                    </Tag>
                  ) : (
                    <Tag color="orange">
                      {intl.formatMessage({ id: 'pages.companySettings.statistics.disabled' })}
                    </Tag>
                  )}
                  {statistics.expiresAt && (
                    <div
                      style={{ marginTop: 8, fontSize: 12, color: '#00000073' }}
                    >
                      <ClockCircleOutlined />{' '}
                      {intl.formatMessage({ id: 'pages.companySettings.statistics.expiresAt' })}
                      {new Date(statistics.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* 企业详细信息 */}
      <Card
        title={intl.formatMessage({ id: 'pages.companySettings.details' })}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditModalVisible(true)}
          >
            {intl.formatMessage({ id: 'pages.companySettings.editCompany' })}
          </Button>
        }
        variant="outlined"
        style={{ marginBottom: 16 }}
      >
        {company && (
          <ProDescriptions
            column={{ xs: 1, sm: 2, md: 2, lg: 2 }}
            bordered
            size="small"
          >
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.name' })}>{company.name}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.code' })}><Tag color="blue">{company.code}</Tag></ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.displayName' })}>{company.displayName || '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.industry' })}>{company.industry || '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.contactName' })}>{company.contactName || '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.contactEmail' })}>{company.contactEmail || '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.contactPhone' })}>{company.contactPhone || '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.edit.logoLabel' })}>{company.logo ? <img src={company.logo} alt="logo" style={{ maxHeight: 32 }} /> : '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.description' })} span={1}>{company.description || '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.createdAt' })}>{company.createdAt ? dayjs(company.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.companySettings.details.updatedAt' })}>{company.updatedAt ? dayjs(company.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
          </ProDescriptions>
        )}
      </Card>

      {/* 编辑企业信息弹窗 */}
      <EditCompanyModal
        open={editModalVisible}
        company={company}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
      />
    </PageContainer>
  );
}
