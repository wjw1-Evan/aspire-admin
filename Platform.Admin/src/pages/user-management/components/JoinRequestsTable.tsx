import React, { useRef, useState, useCallback } from 'react';
import { Button, Tag, Space, message, Modal, Input, Form, Select, Row, Col } from 'antd';
import { JoinRequestDetail, ReviewJoinRequestRequest } from '../types';
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { CheckOutlined, CloseOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import DataTable from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';

interface JoinRequestsTableProps {
    companyId: string;
}

const JoinRequestsTable: React.FC<JoinRequestsTableProps> = ({ companyId }) => {
    const actionRef = useRef<ActionType>(null);
    const intl = useIntl();
    const [searchForm] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [currentRequestId, setCurrentRequestId] = useState<string>('');
    const [rejectReason, setRejectReason] = useState('');

    const handleApprove = async (id: string) => {
        try {
            await request(`/api/company/join-requests/${id}/approve`, {
                method: 'POST',
                data: {},
            });
            messageApi.success('已批准');
            actionRef.current?.reload?.();
        } catch (error) {
            console.error('批准失败:', error);
        }
    };

    const handleReject = async () => {
        try {
            if (!rejectReason.trim()) {
                messageApi.warning('请输入拒绝原因');
                return;
            }
            await request(`/api/company/join-requests/${currentRequestId}/reject`, {
                method: 'POST',
                data: { rejectReason: rejectReason.trim() } as ReviewJoinRequestRequest,
            });
            messageApi.success('已拒绝');
            setRejectModalVisible(false);
            setRejectReason('');
            actionRef.current?.reload?.();
        } catch (error) {
            console.error('拒绝失败:', error);
        }
    };

    const handleSearch = useCallback(() => {
        actionRef.current?.reload?.();
    }, []);

    const handleReset = useCallback(() => {
        searchForm.resetFields();
        actionRef.current?.reload?.();
    }, [searchForm]);

    const columns: ColumnsType<JoinRequestDetail> = [
        {
            title: '申请人',
            dataIndex: 'username',
            key: 'username',
            render: (_: any, record: JoinRequestDetail) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 500 }}>{record.username}</span>
                    <span style={{ color: '#999', fontSize: '12px' }}>{record.userEmail}</span>
                </Space>
            ),
        },
        {
            title: '申请理由',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            render: (text: string) => text || '-',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const statusMap: Record<string, { text: string; color: string }> = {
                    pending: { text: intl.formatMessage({ id: 'pages.status.pending', defaultMessage: '待审核' }), color: 'processing' },
                    approved: { text: intl.formatMessage({ id: 'pages.status.approved', defaultMessage: '已通过' }), color: 'success' },
                    rejected: { text: intl.formatMessage({ id: 'pages.status.rejected', defaultMessage: '已拒绝' }), color: 'error' },
                    cancelled: { text: intl.formatMessage({ id: 'pages.status.cancelled', defaultMessage: '已取消' }), color: 'default' },
                };
                const config = statusMap[status] || { text: status, color: 'default' };
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: '申请时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: '审核人',
            dataIndex: 'reviewedByName',
            key: 'reviewedByName',
            render: (text: string) => text || '-',
        },
        {
            title: '备注/反馈',
            dataIndex: 'rejectReason',
            key: 'rejectReason',
            ellipsis: true,
            render: (text: string, record: JoinRequestDetail) => {
                if (record.status === 'approved') return <span style={{ color: '#52c41a' }}>已通过</span>;
                return text || '-';
            }
        },
        {
            title: '审核时间',
            dataIndex: 'reviewedAt',
            key: 'reviewedAt',
            render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 150,
            render: (_: any, record: JoinRequestDetail) => {
                if (record.status === 'cancelled') return null;
                return (
                    <Space size="small">
                        {record.status !== 'approved' && (
                            <Button
                                type="link"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={() => handleApprove(record.id)}
                            >
                                {intl.formatMessage({ id: 'pages.button.approve', defaultMessage: '批准' })}
                            </Button>
                        )}
                        {record.status !== 'rejected' && (
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    setCurrentRequestId(record.id);
                                    setRejectModalVisible(true);
                                }}
                            >
                                {intl.formatMessage({ id: 'pages.button.reject', defaultMessage: '拒绝' })}
                            </Button>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <>
            {contextHolder}
            <SearchFormCard style={{ marginBottom: 16 }}>
                <Form
                    form={searchForm}
                    layout="inline"
                    onFinish={handleSearch}
                    initialValues={{ status: 'all' }}
                >
                    <Form.Item name="keyword" label={intl.formatMessage({ id: 'pages.userManagement.search.label', defaultMessage: '关键字' })}>
                        <Input
                            placeholder={intl.formatMessage({ id: 'pages.joinRequests.search.placeholder', defaultMessage: '搜索用户名或邮箱' })}
                            allowClear
                            style={{ width: 220 }}
                        />
                    </Form.Item>
                    <Form.Item name="status" label={intl.formatMessage({ id: 'pages.table.status', defaultMessage: '状态' })}>
                        <Select style={{ width: 120 }}>
                            <Select.Option value="all">{intl.formatMessage({ id: 'pages.unifiedNotificationCenter.all', defaultMessage: '全部' })}</Select.Option>
                            <Select.Option value="pending">{intl.formatMessage({ id: 'pages.status.pending', defaultMessage: '待审核' })}</Select.Option>
                            <Select.Option value="approved">{intl.formatMessage({ id: 'pages.status.approved', defaultMessage: '已批准' })}</Select.Option>
                            <Select.Option value="rejected">{intl.formatMessage({ id: 'pages.status.rejected', defaultMessage: '已拒绝' })}</Select.Option>
                            <Select.Option value="cancelled">{intl.formatMessage({ id: 'pages.status.cancelled', defaultMessage: '已取消' })}</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                                {intl.formatMessage({ id: 'pages.button.search', defaultMessage: '搜索' })}
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                                {intl.formatMessage({ id: 'pages.button.reset', defaultMessage: '重置' })}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </SearchFormCard>

            <DataTable<JoinRequestDetail>
                actionRef={actionRef}
                rowKey="id"
                request={async (params) => {
                    const values = searchForm.getFieldsValue();
                    const status = values.status === 'all' ? undefined : values.status;

                    const result = await request(`/api/company/${companyId}/join-requests`, {
                        params: {
                            status: status,
                        },
                    });

                    let data = result.data || [];

                    // 前端关键字过滤
                    if (values.keyword) {
                        const kw = values.keyword.toLowerCase();
                        data = data.filter((item: JoinRequestDetail) =>
                            item.username.toLowerCase().includes(kw) ||
                            (item.userEmail && item.userEmail.toLowerCase().includes(kw))
                        );
                    }

                    return {
                        data: data,
                        success: true,
                        total: data.length,
                    };
                }}
                columns={columns}
                pagination={{
                    pageSize: 10
                }}
            />

            <Modal
                title="拒绝申请"
                open={rejectModalVisible}
                onOk={handleReject}
                onCancel={() => setRejectModalVisible(false)}
                okText="确定"
                cancelText="取消"
                okType="danger"
            >
                <div style={{ marginBottom: 8 }}>请填写拒绝原因：</div>
                <Input.TextArea
                    rows={4}
                    placeholder="请输入拒绝原因"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                />
            </Modal>
        </>
    );
};

export default JoinRequestsTable;
