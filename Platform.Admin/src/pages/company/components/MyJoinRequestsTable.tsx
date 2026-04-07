import React, { useCallback } from 'react';
import { Tag, App, Popconfirm, theme, Button } from 'antd';
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { cancelJoinRequest } from '@/services/company';
import { UndoOutlined } from '@ant-design/icons';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import type { PageParams } from '@/types';

interface JoinRequestDetail {
    id: string;
    companyName: string;
    status: string;
    reason?: string;
    createdAt: string;
    reviewedByName?: string;
    rejectReason?: string;
}

const MyJoinRequestsTable: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const { token } = theme.useToken();

    const handleCancel = useCallback(async (id: string) => {
        try {
            const response = await cancelJoinRequest(id);
            if (response.success) {
                message.success('申请已撤销');
            } else {
                message.error(response.message || '撤销失败');
            }
        } catch (error) {
            console.error('撤销失败:', error);
        }
    }, [message]);

    const columns: ProColumns<JoinRequestDetail>[] = [
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
            render: (_: any, record: JoinRequestDetail) => {
                const statusMap: Record<string, { text: string; color: string }> = {
                    pending: { text: intl.formatMessage({ id: 'pages.status.pending', defaultMessage: '待审核' }), color: 'processing' },
                    approved: { text: intl.formatMessage({ id: 'pages.status.approved', defaultMessage: '已通过' }), color: 'success' },
                    rejected: { text: intl.formatMessage({ id: 'pages.status.rejected', defaultMessage: '已拒绝' }), color: 'error' },
                    cancelled: { text: intl.formatMessage({ id: 'pages.status.cancelled', defaultMessage: '已取消' }), color: 'default' },
                };
                const config = statusMap[record.status] || { text: record.status, color: 'default' };
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: '申请时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-',
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
            render: (dom: any, record: JoinRequestDetail) => {
                if (record.status === 'rejected') {
                    return <span style={{ color: token.colorError }}>拒绝原因: {dom}</span>;
                }
                return '-';
            }
        },
        {
            title: '操作',
            key: 'action',
            valueType: 'option',
            fixed: 'right',
            width: 180,
            render: (_, record) => {
                if (record.status === 'pending') {
                    return (
                        <Popconfirm title="确定要撤销申请吗？" onConfirm={() => handleCancel(record.id)} okText="确定" cancelText="取消">
                            <Button type="link" size="small" danger icon={<UndoOutlined />}>撤销</Button>
                        </Popconfirm>
                    );
                }
                return null;
            }
        },
    ];

    return (
        <ProTable<JoinRequestDetail>
            headerTitle={intl.formatMessage({ id: 'pages.company.myJoinRequests.title', defaultMessage: '我的加入申请' })}
            rowKey="id"
            search={false}
            request={async (params: any) => {
                const { current, pageSize, ...rest } = params;
                const result = await request('/api/company/my-join-requests', {
                    params: { page: current, pageSize, ...rest } as PageParams,
                });
                if (result.data) {
                    const data = result.data || [];
                    return { data, total: data.length || 0, success: true };
                }
                return { data: [], total: 0, success: false };
            }}
            columns={columns}
            scroll={{ x: 'max-content' }}
        />
    );
};

export default MyJoinRequestsTable;
