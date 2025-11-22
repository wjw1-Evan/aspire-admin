import { useEffect, useState } from 'react';
import {
  PageContainer,
  ProCard,
  ProDescriptions,
} from '@ant-design/pro-components';
import { Card, Spin, Row, Col, Statistic, Progress, Tag } from 'antd';
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
    >
      {/* 企业统计 */}
      {statistics && (
        <ProCard
          title={intl.formatMessage({ id: 'pages.companySettings.statistics' })}
          bordered
          headerBordered
          style={{ marginBottom: 24 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Card variant="borderless">
                <Statistic
                  title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalUsers' })}
                  value={statistics.totalUsers}
                  suffix={`/ ${statistics.maxUsers}`}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
                <Progress
                  percent={userUsagePercent}
                  status={userUsagePercent >= 90 ? 'exception' : 'active'}
                  style={{ marginTop: 8 }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card variant="borderless">
                <Statistic
                  title={intl.formatMessage({ id: 'pages.companySettings.statistics.activeUsers' })}
                  value={statistics.activeUsers}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card variant="borderless">
                <Statistic
                  title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalRoles' })}
                  value={statistics.totalRoles}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Card variant="borderless">
                <Statistic
                  title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalMenus' })}
                  value={statistics.totalMenus}
                  prefix={<MenuOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card variant="borderless">
                <Statistic
                  title={intl.formatMessage({ id: 'pages.companySettings.statistics.totalPermissions' })}
                  value={statistics.totalMenus}
                  prefix={<SafetyOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card variant="borderless">
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#00000073' }}>{intl.formatMessage({ id: 'pages.companySettings.statistics.companyStatus' })}</span>
                </div>
                <div>
                  {statistics.isExpired ? (
                    <Tag color="red">{intl.formatMessage({ id: 'pages.companySettings.statistics.expired' })}</Tag>
                  ) : company.isActive ? (
                    <Tag color="green">{intl.formatMessage({ id: 'pages.companySettings.statistics.normal' })}</Tag>
                  ) : (
                    <Tag color="orange">{intl.formatMessage({ id: 'pages.companySettings.statistics.disabled' })}</Tag>
                  )}
                  {statistics.expiresAt && (
                    <div
                      style={{ marginTop: 8, fontSize: 12, color: '#00000073' }}
                    >
                      <ClockCircleOutlined /> {intl.formatMessage({ id: 'pages.companySettings.statistics.expiresAt' })}
                      {new Date(statistics.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </ProCard>
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
