import { useEffect, useState } from 'react';
import {
  PageContainer,
  ProCard,
  ProDescriptions,
} from '@ant-design/pro-components';
import { Card, Spin, Row, Col, Progress, Tag } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { getCurrentCompany, getCompanyStatistics } from '@/services/company';
import EditCompanyModal from './components/EditCompanyModal';
import { StatCard } from '@/components';

export default function CompanySettings() {
  const intl = useIntl();
  const [company, setCompany] = useState<API.Company | null>(null);
  const [statistics, setStatistics] = useState<API.CompanyStatistics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

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

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    fetchData();
    // 消息提示已在 EditCompanyModal 中显示，这里不再重复显示
  };

  if (loading) {
    return (
      <PageContainer style={{ paddingBlock: 12 }}>
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
      <PageContainer style={{ paddingBlock: 12 }}>
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <p>{intl.formatMessage({ id: 'pages.companySettings.companyNotFound' })}</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  const userUsagePercent = statistics
    ? Math.round((statistics.totalUsers / statistics.maxUsers) * 100)
    : 0;

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'pages.companySettings.title' })}
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
              <Progress
                percent={userUsagePercent}
                status={userUsagePercent >= 90 ? 'exception' : 'active'}
                style={{ marginTop: 8 }}
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
                bodyStyle={{ padding: '10px 12px' }}
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
      <ProCard title={intl.formatMessage({ id: 'pages.companySettings.details' })} bordered headerBordered>
        <ProDescriptions
          column={2}
          dataSource={company}
          styles={{
            content: {},
          }}
          columns={[
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.name' }),
              dataIndex: 'name',
              copyable: true,
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.code' }),
              dataIndex: 'code',
              copyable: true,
              render: (_, record) => <Tag color="blue">{record.code}</Tag>,
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.industry' }),
              dataIndex: 'industry',
              render: (text) => text || '-',
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.contactName' }),
              dataIndex: 'contactName',
              render: (text) => text || '-',
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.contactEmail' }),
              dataIndex: 'contactEmail',
              copyable: true,
              render: (text) => text || '-',
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.contactPhone' }),
              dataIndex: 'contactPhone',
              copyable: true,
              render: (text) => text || '-',
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.description' }),
              dataIndex: 'description',
              span: 2,
              render: (text) => text || '-',
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.createdAt' }),
              dataIndex: 'createdAt',
              valueType: 'dateTime',
            },
            {
              title: intl.formatMessage({ id: 'pages.companySettings.details.updatedAt' }),
              dataIndex: 'updatedAt',
              valueType: 'dateTime',
            },
          ]}
        />
      </ProCard>

      {/* 编辑企业信息弹窗 */}
      <EditCompanyModal
        visible={editModalVisible}
        company={company}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
      />
    </PageContainer>
  );
}
