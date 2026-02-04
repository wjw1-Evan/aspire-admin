import React, { useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Space, App, Popconfirm, theme } from 'antd';
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { cancelJoinRequest } from '@/services/company';

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
                actionRef.current?.reload();
            } else {
                message.error(response.errorMessage || '撤销失败');
            }
        } catch (error) {
            console.error('撤销失败:', error);
        }
    };

    const columns: ProColumns<JoinRequestDetail>[] = [
        {
            title: '企业名称',
            dataIndex: 'companyName',
            width: 200,
        },
        {
            title: '申请理由',
            dataIndex: 'reason',
            ellipsis: true,
            search: false,
        },
        {
            title: '状态',
            dataIndex: 'status',
            valueEnum: {
                pending: { text: '待审核', status: 'Processing' },
                approved: { text: '已批准', status: 'Success' },
                rejected: { text: '已拒绝', status: 'Error' },
                cancelled: { text: '已取消', status: 'Default' },
            },
        },
        {
            title: '申请时间',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
            search: false,
        },
        {
            title: '审核人',
            dataIndex: 'reviewedByName',
            search: false,
            render: (text) => text || '-',
        },
        {
            title: '备注',
            dataIndex: 'rejectReason',
            search: false,
            render: (text, record) => {
                if (record.status === 'rejected') {
                    return <span style={{ color: token.colorError }}>拒绝原因: {text}</span>;
                }
                return '-';
            }
        },
        {
            title: '操作',
            valueType: 'option',
            render: (_, record) => {
                if (record.status === 'pending') {
                    return (
                        <Popconfirm
                            title="确定要撤销申请吗？"
                            onConfirm={() => handleCancel(record.id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <a style={{ color: token.colorError }}>撤销</a>
                        </Popconfirm>
                    );
                }
                return null;
            }
        },
    ];

    return (
        <ProTable<JoinRequestDetail>
            headerTitle="我的加入申请"
            actionRef={actionRef}
            rowKey="id"
            search={false}
            request={async () => {
                const result = await request('/api/company/my-join-requests');
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
