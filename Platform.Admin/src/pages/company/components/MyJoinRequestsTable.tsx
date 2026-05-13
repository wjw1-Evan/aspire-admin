import React, { useCallback } from 'react';
import { Tag, App, Popconfirm, theme, Button, Space } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { cancelJoinRequest, getMyJoinRequests } from '@/services/company';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { UndoOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable, ProColumns } from '@ant-design/pro-components/es/table';
import type { JoinRequestDetail } from '@/types';

const MyJoinRequestsTable: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const { token } = theme.useToken();

    const handleCancel = useCallback(async (id: string) => {
        try {
            const response = await cancelJoinRequest(id);
            if (response.success) {
                message.success(intl.formatMessage({ id: 'pages.company.requestCancelled' }));
            } else {
                message.error(getErrorMessage(response, 'pages.company.cancelFailed'));
            }
        } catch (error) {
            console.error('撤销失败:', error);
        }
    }, [message, intl]);

    const columns: ProColumns<JoinRequestDetail>[] = [
        {
            title: intl.formatMessage({ id: 'pages.company.joinRequest.companyName' }),
            dataIndex: 'companyName',
            key: 'companyName',
            width: 200,
            sorter: true,
        },
        {
            title: intl.formatMessage({ id: 'pages.company.joinRequest.reason' }),
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            sorter: true,
            render: (text) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.common.status' }),
            dataIndex: 'status',
            key: 'status',
            sorter: true,
            render: (_: any, record: JoinRequestDetail) => {
                const statusMap: Record<string, { text: string; color: string }> = {
                    pending: { text: intl.formatMessage({ id: 'pages.status.pending' }), color: 'processing' },
                    approved: { text: intl.formatMessage({ id: 'pages.status.approved' }), color: 'success' },
                    rejected: { text: intl.formatMessage({ id: 'pages.status.rejected' }), color: 'error' },
                    cancelled: { text: intl.formatMessage({ id: 'pages.status.cancelled' }), color: 'default' },
                };
                const config = statusMap[record.status] || { text: record.status, color: 'default' };
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.company.joinRequest.createdAt' }),
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.company.joinRequest.reviewer' }),
            dataIndex: 'reviewedByName',
            key: 'reviewedByName',
            sorter: true,
            render: (text) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.company.joinRequest.remarks' }),
            dataIndex: 'rejectReason',
            key: 'rejectReason',
            sorter: true,
            render: (dom: any, record: JoinRequestDetail) => {
                if (record.status === 'rejected') {
                    return <span style={{ color: token.colorError }}>{intl.formatMessage({ id: 'pages.company.joinRequest.rejectReason' })}: {dom}</span>;
                }
                return '-';
            }
        },
        {
            title: intl.formatMessage({ id: 'pages.table.action' }),
            key: 'action',
            valueType: 'option',
            fixed: 'right',
            width: 180,
            render: (_, record) => {
                if (record.status === 'pending') {
                    return (
                        <Popconfirm title={intl.formatMessage({ id: 'pages.company.joinRequest.confirmCancel' })} onConfirm={() => handleCancel(record.id)} okText={intl.formatMessage({ id: 'pages.common.confirm' })} cancelText={intl.formatMessage({ id: 'pages.common.cancel' })}>
                            <Button type="link" size="small" danger icon={<UndoOutlined />}>{intl.formatMessage({ id: 'pages.common.revoke' })}</Button>
                        </Popconfirm>
                    );
                }
                return null;
            }
        },
    ];

    return (
        <ProTable<JoinRequestDetail>
            headerTitle={
              <Space size={24}>
                <Space><TeamOutlined />{intl.formatMessage({ id: 'pages.company.myRequests.title' })}</Space>
              </Space>
            }
            rowKey="id"
            search={false}
            request={async (params: any) => {
                const result = await getMyJoinRequests();
                if (result.success && result.data) {
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
