import { useEffect, useState } from 'react';
import { PageContainer } from '@/components';
import { Card, Spin, Row, Col, Tag, Descriptions, Space } from 'antd';
import {
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
import { StatCard } from '@/components';
import dayjs from 'dayjs';

// 统一的日期时间格式化函数
const formatDateTime = (dateTime: string | null | undefined): string => {
  if (!dateTime) return '-';
  try {
    const date = dayjs(dateTime);
    if (!date.isValid()) return dateTime;
    return date.format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.error('日期格式化错误:', error, dateTime);
    return dateTime || '-';
  }
};

export default function CompanySettings() {
  const intl = useIntl();
  const [company, setCompany] = useState<API.Company | null>(null);
  const [statistics, setStatistics] = useState<API.CompanyStatistics | null>(
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
      <PageContainer
        style={{ paddingBlock: 12 }}
      >
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
      <PageContainer
        style={{ paddingBlock: 12 }}
      >
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <p>{intl.formatMessage({ id: 'pages.companySettings.companyNotFound' })}</p>
          </div>
        </Card>
      </PageContainer>
    );
  }


  return (
    <PageContainer
      title={
        <Space>
          <SettingOutlined />
          {intl.formatMessage({ id: 'pages.companySettings.title' })}
        </Space>
      }
      extra={[
        <a key="edit" onClick={() => setEditModalVisible(true)}>
          {intl.formatMessage({ id: 'pages.companySettings.editCompany' })}
        </a>,
      ]}
      style={{ paddingBlock: 12 }}
    >
      {/* 企业统计：使用 StatCard 统一风格 */}
      {statistics && (
        <Card
          title={intl.formatMessage({ id: 'pages.companySettings.statistics' })}
          style={{ marginBottom: 16, borderRadius: 12 }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalUsers' })}
                value={`${statistics.totalUsers} / ${statistics.maxUsers}`}
                icon={<UserOutlined />}
                color="#3f8600"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.activeUsers' })}
                value={statistics.activeUsers}
                icon={<UserOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalRoles' })}
                value={statistics.totalRoles}
                icon={<TeamOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalMenus' })}
                value={statistics.totalMenus}
                icon={<MenuOutlined />}
                color="#1890ff"
              />
            </Col>
          </Row>
          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalPermissions' })}
                value={statistics.totalMenus}
                icon={<SafetyOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
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
        variant="outlined"
        style={{ marginBottom: 16 }}
      >
        {company && (
          <Descriptions
            column={2}
            bordered
            items={[
              {
                key: 'name',
                label: intl.formatMessage({ id: 'pages.companySettings.details.name' }),
                children: company.name,
              },
              {
                key: 'code',
                label: intl.formatMessage({ id: 'pages.companySettings.details.code' }),
                children: <Tag color="blue">{company.code}</Tag>,
              },
              {
                key: 'displayName',
                label: intl.formatMessage({ id: 'pages.companySettings.details.displayName' }),
                children: company.displayName || '-',
              },
              {
                key: 'industry',
                label: intl.formatMessage({ id: 'pages.companySettings.details.industry' }),
                children: company.industry || '-',
              },
              {
                key: 'contactName',
                label: intl.formatMessage({ id: 'pages.companySettings.details.contactName' }),
                children: company.contactName || '-',
              },
              {
                key: 'contactEmail',
                label: intl.formatMessage({ id: 'pages.companySettings.details.contactEmail' }),
                children: company.contactEmail || '-',
              },
              {
                key: 'contactPhone',
                label: intl.formatMessage({ id: 'pages.companySettings.details.contactPhone' }),
                children: company.contactPhone || '-',
              },
              {
                key: 'logo',
                label: intl.formatMessage({ id: 'pages.companySettings.edit.logoLabel' }),
                children: company.logo ? (
                  <img src={company.logo} alt="logo" style={{ maxHeight: 32 }} />
                ) : (
                  '-'
                ),
              },
              {
                key: 'description',
                label: intl.formatMessage({ id: 'pages.companySettings.details.description' }),
                span: 2,
                children: company.description || '-',
              },
              {
                key: 'createdAt',
                label: intl.formatMessage({ id: 'pages.companySettings.details.createdAt' }),
                children: formatDateTime(company.createdAt),
              },
              {
                key: 'updatedAt',
                label: intl.formatMessage({ id: 'pages.companySettings.details.updatedAt' }),
                children: formatDateTime(company.updatedAt),
              },
            ]}
          />
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
