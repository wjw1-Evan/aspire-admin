import React, { useRef } from 'react';
import { Tag, Space, App, Popconfirm, theme, Button } from 'antd';
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { cancelJoinRequest } from '@/services/company';
import { UndoOutlined } from '@ant-design/icons';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';

interface MyJoinRequestsTableProps {
    // 可以添加 props
}

interface JoinRequestDetail {
    id: string;
    companyName: string;
    status: string;
    reason?: string;
    createdAt: string;
    reviewedByName?: string;
    rejectReason?: string;
}

const MyJoinRequestsTable: React.FC<MyJoinRequestsTableProps> = () => {
    const actionRef = useRef<ActionType>(null);
    const intl = useIntl();
    const { message } = App.useApp();
    const { token } = theme.useToken();

    const handleCancel = async (id: string) => {
        try {
            const response = await cancelJoinRequest(id);
            if (response.success) {
                message.success('申请已撤销');
                actionRef.current?.reload?.();
            } else {
                message.error(response.message || '撤销失败');
            }
        } catch (error) {
            console.error('撤销失败:', error);
        }
    };

    const columns: ColumnsType<JoinRequestDetail> = [
        {
            title: '企业名称',
            dataIndex: 'companyName',
            key: 'companyName',
            width: 200,
            sorter: true,
        },
        {
            title: '申请理由',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            sorter: true,
            render: (text) => text || '-',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            sorter: true,
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
            sorter: true,
            render: (text) => text || '-',
        },
        {
            title: '备注',
            dataIndex: 'rejectReason',
            key: 'rejectReason',
            sorter: true,
            render: (text, record) => {
                if (record.status === 'rejected') {
                    return <span style={{ color: token.colorError }}>拒绝原因: {text}</span>;
                }
                return '-';
            }
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 120,
            render: (_, record) => {
                if (record.status === 'pending') {
                    return (
                        <Popconfirm
                            title="确定要撤销申请吗？"
                            onConfirm={() => handleCancel(record.id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<UndoOutlined />}
                            >
                                撤销
                            </Button>
                        </Popconfirm>
                    );
                }
                return null;
            }
        },
    ];

    return (
        <DataTable<JoinRequestDetail>
            actionRef={actionRef}
            rowKey="id"
            request={async (_params, sorter) => {
                let sortBy: string | undefined;
                let sortOrder: 'asc' | 'desc' | undefined;

                if (sorter && Object.keys(sorter).length > 0) {
                    const sortKey = Object.keys(sorter)[0];
                    const sortValue = sorter[sortKey];
                    if (sortValue) {
                        sortBy = sortKey;
                        sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
                    }
                }

                const result = await request('/api/company/my-join-requests', {
                    params: { sortBy, sortOrder },
                });
                return {
                    data: result.data || [],
                    success: true,
                    total: result.data?.length || 0,
                };
            }}
            columns={columns}
            pagination={{
                pageSize: 10
            }}
        />
    );
};

export default MyJoinRequestsTable;
