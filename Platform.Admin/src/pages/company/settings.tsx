import { useEffect, useState } from 'react';
import {
  PageContainer,
  ProCard,
  ProDescriptions,
} from '@ant-design/pro-components';
import { Card, message, Spin, Row, Col, Statistic, Progress, Tag } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getCurrentCompany, getCompanyStatistics } from '@/services/company';
import EditCompanyModal from './components/EditCompanyModal';

export default function CompanySettings() {
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
    } catch (error: any) {
      message.error(error.message || '加载企业信息失败');
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
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" tip="加载中..." />
        </div>
      </PageContainer>
    );
  }

  if (!company) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <p>未找到企业信息</p>
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
      title="企业设置"
      extra={[
        <a key="edit" onClick={() => setEditModalVisible(true)}>
          编辑企业信息
        </a>,
      ]}
    >
      {/* 企业统计 */}
      {statistics && (
        <ProCard
          title="企业数据统计"
          bordered
          headerBordered
          style={{ marginBottom: 24 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Card bordered={false}>
                <Statistic
                  title="用户总数"
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
              <Card bordered={false}>
                <Statistic
                  title="活跃用户"
                  value={statistics.activeUsers}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false}>
                <Statistic
                  title="角色数量"
                  value={statistics.totalRoles}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Card bordered={false}>
                <Statistic
                  title="菜单数量"
                  value={statistics.totalMenus}
                  prefix={<MenuOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false}>
                <Statistic
                  title="权限数量"
                  value={statistics.totalPermissions}
                  prefix={<SafetyOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#00000073' }}>企业状态</span>
                </div>
                <div>
                  {statistics.isExpired ? (
                    <Tag color="red">已过期</Tag>
                  ) : company.isActive ? (
                    <Tag color="green">正常</Tag>
                  ) : (
                    <Tag color="orange">已停用</Tag>
                  )}
                  {statistics.expiresAt && (
                    <div
                      style={{ marginTop: 8, fontSize: 12, color: '#00000073' }}
                    >
                      <ClockCircleOutlined /> 过期时间：
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
      <ProCard title="企业详细信息" bordered headerBordered>
        <ProDescriptions
          column={2}
          dataSource={company}
          columns={[
            {
              title: '企业名称',
              dataIndex: 'name',
              copyable: true,
            },
            {
              title: '企业代码',
              dataIndex: 'code',
              copyable: true,
              render: (_, record) => <Tag color="blue">{record.code}</Tag>,
            },
            {
              title: '所属行业',
              dataIndex: 'industry',
              render: (text) => text || '-',
            },
            {
              title: '联系人',
              dataIndex: 'contactName',
              render: (text) => text || '-',
            },
            {
              title: '联系邮箱',
              dataIndex: 'contactEmail',
              copyable: true,
              render: (text) => text || '-',
            },
            {
              title: '联系电话',
              dataIndex: 'contactPhone',
              copyable: true,
              render: (text) => text || '-',
            },
            {
              title: '企业描述',
              dataIndex: 'description',
              span: 2,
              render: (text) => text || '-',
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              valueType: 'dateTime',
            },
            {
              title: '更新时间',
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
