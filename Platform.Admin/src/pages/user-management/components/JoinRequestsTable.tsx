import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Tag, Space, message, Modal, Input, Form, Select, Row, Col, Table } from 'antd';
import { JoinRequestDetail, ReviewJoinRequestRequest } from '../types';
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { CheckOutlined, CloseOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import SearchBar from '@/components/SearchBar';
import type { ColumnsType } from 'antd/es/table';
import type { PageParams } from '@/types/page-params';

interface JoinRequestsTableProps {
    companyId: string;
}

const JoinRequestsTable: React.FC<JoinRequestsTableProps> = ({ companyId }) => {
    const intl = useIntl();
    const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 10, search: '' });
    const [messageApi, contextHolder] = message.useMessage();
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [currentRequestId, setCurrentRequestId] = useState<string>('');
    const [rejectReason, setRejectReason] = useState('');
    const [data, setData] = useState<JoinRequestDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

    const fetchData = useCallback(async () => {
        const currentParams = searchParamsRef.current;

        setLoading(true);
        try {
            const status = currentParams.status === 'all' ? undefined : currentParams.status;

            const result = await request(`/api/company/${companyId}/join-requests`, {
                params: { status },
            });

            let filteredData = result.data || [];

            if (currentParams.search) {
                const kw = currentParams.search.toLowerCase();
                filteredData = filteredData.filter((item: JoinRequestDetail) =>
                    item.username.toLowerCase().includes(kw) ||
                    (item.userEmail && item.userEmail.toLowerCase().includes(kw))
                );
            }

            setData(filteredData);
            setPagination(prev => ({
                ...prev,
                page: currentParams.page ?? prev.page,
                pageSize: currentParams.pageSize ?? prev.pageSize,
                total: filteredData.length,
            }));
        } catch (error) {
            console.error('加载数据失败:', error);
            setData([]);
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
        setPagination(prev => ({
            ...prev,
            page: pag.current,
            pageSize: pag.pageSize,
        }));
        fetchData();
    }, [fetchData]);

    const handleSearch = useCallback((params: PageParams) => {
        searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
        fetchData();
    }, [fetchData]);

    const handleApprove = async (id: string) => {
        try {
            await request(`/api/company/join-requests/${id}/approve`, {
                method: 'POST',
                data: {},
            });
            messageApi.success('已批准');
            fetchData();
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
            fetchData();
        } catch (error) {
            console.error('拒绝失败:', error);
        }
    };


    const columns: ColumnsType<JoinRequestDetail> = [
        {
            title: '申请人',
            dataIndex: 'username',
            key: 'username',
            sorter: true,
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
            sorter: true,
            ellipsis: true,
            render: (text: string) => text || '-',
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
            render: (text: string) => text || '-',
        },
        {
            title: '备注/反馈',
            dataIndex: 'rejectReason',
            key: 'rejectReason',
            sorter: true,
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
            sorter: true,
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
            <SearchBar
                initialParams={searchParamsRef.current}
                onSearch={handleSearch}
                style={{ marginBottom: 16 }}
            />

            <Table<JoinRequestDetail>
                dataSource={data}
                columns={columns}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                onChange={handleTableChange}
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
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
