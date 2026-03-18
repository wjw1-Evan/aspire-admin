import React from 'react';
import { Card, Row, Col, Space, Alert, Typography, Tag, theme, Button } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';
import useCommonStyles from '@/hooks/useCommonStyles';
import StatCard from './StatCard';
import type { Document, DocumentStatistics } from '@/services/document/api';

const { Text } = Typography;

interface ApprovalOverviewCardProps {
  readonly statistics: DocumentStatistics | null;
  readonly pendingDocuments: Document[];
  readonly loading: boolean;
}

const ApprovalOverviewCard: React.FC<ApprovalOverviewCardProps> = ({
  statistics,
  pendingDocuments,
  loading
}) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { styles } = useCommonStyles();

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined />
          <span>{intl.formatMessage({ id: 'pages.document.approval', defaultMessage: '我的审批' })}</span>
        </Space>
      }
      className={styles.card}
      style={{ height: '100%' }}
    >
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={12} md={12} lg={6}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.document.stat.pending', defaultMessage: '待审批' })}
            value={statistics?.pendingCount ?? 0}
            icon={<ClockCircleOutlined />}
            color={token.colorWarning}
            loading={loading}
            token={token}
            onClick={() => history.push('/document/approval')}
          />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.document.stat.myCreated', defaultMessage: '我发起的' })}
            value={statistics?.myCreatedCount ?? 0}
            icon={<FileTextOutlined />}
            color={token.colorPrimary}
            loading={loading}
            token={token}
            onClick={() => history.push('/document/approval')}
          />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.document.stat.approved', defaultMessage: '已通过' })}
            value={statistics?.approvedCount ?? 0}
            icon={<CheckCircleOutlined />}
            color={token.colorSuccess}
            loading={loading}
            token={token}
            onClick={() => history.push('/document/approval')}
          />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.document.stat.rejected', defaultMessage: '已驳回' })}
            value={statistics?.rejectedCount ?? 0}
            icon={<CloseCircleOutlined />}
            color={token.colorError}
            loading={loading}
            token={token}
            onClick={() => history.push('/document/approval')}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <Space style={{ marginBottom: 8 }}>
          <ClockCircleOutlined />
          <span>{intl.formatMessage({ id: 'pages.document.approval.tab.pending', defaultMessage: '待处理列表' })}</span>
        </Space>
        {pendingDocuments.length === 0 ? (
          <Alert
            type="info"
            title={intl.formatMessage({ id: 'pages.welcome.myTodoTasks.empty', defaultMessage: '当前没有待办任务' })}
            showIcon
          />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pendingDocuments.slice(0, 5).map((doc) => (
              <li
                key={doc.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => history.push('/document/approval')}
              >
                <Space direction="vertical" size={2} style={{ flex: 1 }}>
                  <Space>
                    <Text strong>{doc.title}</Text>
                    <Tag color="blue">{doc.documentType}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {doc.createdBy} · {doc.createdAt ? new Date(doc.createdAt).toLocaleString() : ''}
                  </Text>
                </Space>
                <Button type="link" size="small" icon={<EyeOutlined />}>
                  {intl.formatMessage({ id: 'pages.document.action.view', defaultMessage: '详情' })}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default ApprovalOverviewCard;
