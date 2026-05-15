import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import { Alert, Button, Col, Row, Space, Tag, Typography, theme } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import useCommonStyles from '@/hooks/useCommonStyles';
import type { DocumentStatistics } from '@/services/document/api';
import StatCard from './StatCard';
import { ProCard } from '@ant-design/pro-components';


const { Text } = Typography;

interface TodoItem {
  id: string;
  documentId: string;
  currentNodeId: string;
  startedBy: string;
  startedAt?: string;
  definitionName: string;
  currentStatus: number;
  document?: {
    id: string;
    title: string;
    status: number;
    documentType: string;
    category: string;
    createdAt: string;
    createdBy: string;
  };
}

interface ApprovalOverviewCardProps {
  readonly statistics: DocumentStatistics | null;
  readonly pendingDocuments: TodoItem[];
  readonly loading: boolean;
}

const ApprovalOverviewCard: React.FC<ApprovalOverviewCardProps> = ({ statistics, pendingDocuments, loading }) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { styles } = useCommonStyles();

  return (
    <ProCard
      title={
        <Space>
          <CheckCircleOutlined />
          <span>{intl.formatMessage({ id: 'pages.document.approval' })}</span>
        </Space>
      }
      className={styles.card}
      style={{ height: '100%', borderRadius: '12px' }}
    >
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={12} md={12} lg={6}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.document.stat.pending' })}
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
            title={intl.formatMessage({ id: 'pages.document.stat.myCreated' })}
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
            title={intl.formatMessage({ id: 'pages.document.stat.approved' })}
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
            title={intl.formatMessage({ id: 'pages.document.stat.rejected' })}
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
          <span>{intl.formatMessage({ id: 'pages.document.approval.tab.pending' })}</span>
        </Space>
        {pendingDocuments.length === 0 ? (
          <Alert type="info" title={intl.formatMessage({ id: 'pages.welcome.myTodoTasks.empty' })} showIcon />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pendingDocuments.slice(0, 5).map((item) => (
              <li
                key={item.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onClick={() => history.push('/document/approval')}
              >
                <Space orientation="vertical" size={2} style={{ flex: 1 }}>
                  <Space>
                    <Text strong>{item.document?.title || item.definitionName}</Text>
                    {item.document?.documentType && <Tag color="blue">{item.document.documentType}</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.startedBy} · {item.startedAt ? dayjs(item.startedAt).format('YYYY-MM-DD HH:mm') : ''}
                  </Text>
                </Space>
                <Button type="link" icon={<EyeOutlined />}>
                  {intl.formatMessage({ id: 'pages.document.action.view' })}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProCard>
  );
};

export default ApprovalOverviewCard;
