import React, { useRef, useState } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Space, message, Modal, Input } from 'antd';
import { JoinRequestDetail, ReviewJoinRequestRequest } from '../types';
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';

interface JoinRequestsTableProps {
    companyId: string;
}

const JoinRequestsTable: React.FC<JoinRequestsTableProps> = ({ companyId }) => {
    const actionRef = useRef<ActionType>(null);
    const intl = useIntl();
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [currentRequestId, setCurrentRequestId] = useState<string>('');
    const [rejectReason, setRejectReason] = useState('');

    const handleApprove = async (id: string) => {
        try {
            await request(`/api/company/join-requests/${id}/approve`, {
                method: 'POST',
                data: {},
            });
            message.success('已批准');
            actionRef.current?.reload();
        } catch (error) {
            console.error('批准失败:', error);
        }
    };

    const handleReject = async () => {
        try {
            await request(`/api/company/join-requests/${currentRequestId}/reject`, {
                method: 'POST',
                data: { rejectReason } as ReviewJoinRequestRequest,
            });
            message.success('已拒绝');
            setRejectModalVisible(false);
            setRejectReason('');
            actionRef.current?.reload();
        } catch (error) {
            console.error('拒绝失败:', error);
        }
    };

    const columns: ProColumns<JoinRequestDetail>[] = [
        {
            title: '申请人',
            dataIndex: 'username',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <span>{record.username}</span>
                    <span style={{ color: '#999', fontSize: '12px' }}>{record.userEmail}</span>
                </Space>
            ),
        },
        {
            title: '申请理由',
            dataIndex: 'reason',
            ellipsis: true,
            search: false,
        },
        {
            title: '申请时间',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
            search: false,
        },
        {
            title: '状态',
            dataIndex: 'status',
            valueEnum: {
                all: { text: '全部', status: 'Default' },
                pending: { text: '待审核', status: 'Processing' },
                approved: { text: '已批准', status: 'Success' },
                rejected: { text: '已拒绝', status: 'Error' },
                cancelled: { text: '已取消', status: 'Default' },
            },
            initialValue: 'pending',
        },
        {
            title: '审核人',
            dataIndex: 'reviewedByName',
            search: false,
        },
        {
            title: '审核时间',
            dataIndex: 'reviewedAt',
            valueType: 'dateTime',
            search: false,
        },
        {
            title: '操作',
            valueType: 'option',
            render: (_, record) => {
                if (record.status !== 'pending') return null;
                return (
                    <Space>
                        <a onClick={() => handleApprove(record.id)}>批准</a>
                        <a
                            style={{ color: 'red' }}
                            onClick={() => {
                                setCurrentRequestId(record.id);
                                setRejectModalVisible(true);
                            }}
                        >
                            拒绝
                        </a>
                    </Space>
                );
            },
        },
    ];

    return (
        <>
            <ProTable<JoinRequestDetail>
                headerTitle="加入申请列表"
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                request={async (params) => {
                    // 处理 "all" 状态
                    const status = params.status === 'all' ? undefined : params.status;

                    const result = await request(`/api/company/${companyId}/join-requests`, {
                        params: {
                            status: status,
                        },
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
            <Modal
                title="拒绝申请"
                open={rejectModalVisible}
                onOk={handleReject}
                onCancel={() => setRejectModalVisible(false)}
            >
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
