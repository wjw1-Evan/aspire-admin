import React from 'react';
import { Card, Row, Col } from 'antd';
import {
    FileTextOutlined,
    EditOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SendOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { StatCard } from '@/components';
import { type DocumentStatistics as DocumentStatisticsType } from '@/services/document/api';

interface DocumentStatisticsProps {
    statistics: DocumentStatisticsType | null;
}

const DocumentStatistics: React.FC<DocumentStatisticsProps> = ({ statistics }) => {
    const intl = useIntl();

    if (!statistics) return null;

    return (
        <Card style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={4}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.document.stat.total', defaultMessage: '总公文' })}
                        value={statistics.totalDocuments}
                        icon={<FileTextOutlined />}
                        color="#1890ff"
                    />
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.document.stat.draft', defaultMessage: '草稿箱' })}
                        value={statistics.draftCount}
                        icon={<EditOutlined />}
                        color="#d9d9d9"
                    />
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.document.stat.pending', defaultMessage: '待审批' })}
                        value={statistics.pendingCount}
                        icon={<ClockCircleOutlined />}
                        color="#faad14"
                    />
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.document.stat.approved', defaultMessage: '已通过' })}
                        value={statistics.approvedCount}
                        icon={<CheckCircleOutlined />}
                        color="#52c41a"
                    />
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.document.stat.rejected', defaultMessage: '已驳回' })}
                        value={statistics.rejectedCount}
                        icon={<CloseCircleOutlined />}
                        color="#ff4d4f"
                    />
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.document.stat.myCreated', defaultMessage: '我发起的' })}
                        value={statistics.myCreatedCount}
                        icon={<SendOutlined />}
                        color="#722ed1"
                    />
                </Col>
            </Row>
        </Card>
    );
};

export default DocumentStatistics;
