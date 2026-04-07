import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Space, Modal, Form, Input, Select, App, Popconfirm, Tag } from 'antd';
import { DeleteOutlined, ClearOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, PageParams } from '@/types';

dayjs.extend(relativeTime);

interface RecycleItem { id: string; name: string; originalPath?: string; size: number; isFolder: boolean; extension?: string; deletedAt: string; deletedByName?: string; daysUntilPermanentDelete: number; createdAt: string; createdByName?: string; description?: string; tags?: string[]; type?: string | number; }
interface RecycleStatistics { totalItems: number; totalSize: number; oldestItem?: string; newestItem?: string; }

const api = {
    list: (params: PageParams) => request<ApiResponse<PagedResult<RecycleItem>>>('/api/cloud-storage/recycle', { params }),
    restore: (id: string, data: { itemId: string; newParentId?: string }) => request<ApiResponse<void>>(`/api/cloud-storage/recycle-bin/${id}/restore`, { method: 'POST', data }),
    permanentDelete: (id: string) => request<ApiResponse<void>>(`/api/cloud-storage/recycle-bin/${id}`, { method: 'DELETE' }),
    empty: () => request<ApiResponse<{ deletedCount: number; freedSpace: number }>>('/api/cloud-storage/recycle-bin/empty', { method: 'DELETE' }),
    statistics: () => request<ApiResponse<RecycleStatistics>>('/api/cloud-storage/recycle/statistics'),
};

const CloudStorageRecyclePage: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [searchText, setSearchText] = useState('');

    const formatFileSize = (bytes: number) => { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; };

    const columns: ProColumns<RecycleItem>[] = [
        { title: '名称', dataIndex: 'name', key: 'name', sorter: true, copyable: true },
        { title: '原路径', dataIndex: 'originalPath', key: 'originalPath', ellipsis: true, copyable: true },
        { title: '大小', dataIndex: 'size', key: 'size', valueType: 'digit', sorter: true, renderText: (size: number, r: RecycleItem) => r.isFolder ? '-' : formatFileSize(size) },
        { title: '删除时间', dataIndex: 'deletedAt', key: 'deletedAt', valueType: 'dateTime', sorter: true },
        { title: '删除者', dataIndex: 'deletedByName', key: 'deletedByName', sorter: true },
        {
            title: '过期状态', key: 'expiry', render: (_, r: RecycleItem) => {
                if (r.daysUntilPermanentDelete <= 0) return <span style={{ color: '#ff4d4f' }}>已过期</span>;
                if (r.daysUntilPermanentDelete <= 7) return <span style={{ color: '#fa8c16' }}>{r.daysUntilPermanentDelete}天后过期</span>;
                return <span style={{ color: '#52c41a' }}>{r.daysUntilPermanentDelete}天后过期</span>;
            }
        },
        {
            title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 180,
            render: (_, r: RecycleItem) => (
                <Space size={4}>
                    <Button type="link" size="small" icon={<UndoOutlined />} onClick={() => {
                        form.setFieldsValue({ newName: r.name });
                        Modal.confirm({
                            title: '恢复文件',
                            content: (
                                <Form form={form} layout="vertical">
                                    <Form.Item name="newName" label="文件名">
                                        <Input placeholder="请输入文件名" />
                                    </Form.Item>
                                </Form>
                            ),
                            onOk: async () => {
                                try {
                                    await api.restore(r.id, { itemId: r.id });
                                    message.success('恢复成功');
                                    actionRef.current?.reload();
                                } catch { message.error('恢复失败'); }
                            }
                        });
                    }}>恢复</Button>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                        Modal.confirm({ title: '确认永久删除', content: `确定要永久删除文件 "..." 吗？此操作不可恢复。`, okText: '删除', okType: 'danger', onOk: async () => {
                            try { await api.permanentDelete(r.id); message.success('删除成功'); actionRef.current?.reload(); } catch { message.error('删除失败'); }
                        }});
                    }}>删除</Button>
                </Space>
            )
        },
    ];

    return (
        <PageContainer>
            <ProTable
                headerTitle={
            <Space size={24}>
              <Space><DeleteOutlined />回收站</Space>
              <Space size={12}>
                <Tag color="blue">总数 0</Tag>
                <Tag color="orange">即将过期 0</Tag>
                <Tag color="green">可恢复 0</Tag>
              </Space>
            </Space>
          }
                actionRef={actionRef}
                rowKey="id"
                search={false}
                request={async (params: any) => {
                    const { current, pageSize, sortBy, sortOrder } = params;
                    const res = await api.list({ page: current, pageSize, search: searchText, sortBy, sortOrder } as PageParams);
                    if (res.success && res.data) {
                        const list = (res.data.queryable || []).map((item: RecycleItem) => ({ ...item, isFolder: item.isFolder ?? (item.type === 'folder' || item.type === 'Folder' || item.type === 1) }));
                        return { data: list, total: res.data.rowCount || 0, success: true };
                    }
                    return { data: [], total: 0, success: false };
                }}
                columns={columns}
                scroll={{ x: 'max-content' }}
                toolBarRender={() => [
                  <Input.Search
                    key="search"
                    placeholder="搜索..."
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onSearch={(value) => { setSearchText(value); actionRef.current?.reload(); }}
                    style={{ width: 260, marginRight: 8 }}
                    prefix={<SearchOutlined />}
                  />,
                  <Button key="empty" danger type="primary" icon={<ClearOutlined />} onClick={() => {
                    Modal.confirm({
                        title: '确认清空回收站',
                        content: '确定要清空整个回收站吗？此操作将永久删除所有文件，无法恢复！',
                        okText: '清空',
                        okType: 'danger',
                        onOk: async () => {
                            try {
                                const res = await api.empty();
                                if (res.success && res.data) message.success(`清空成功，删除了 ${res.data.deletedCount} 个文件`);
                                actionRef.current?.reload();
                            } catch { message.error('清空失败'); }
                        }
                    });
                  }}>清空回收站</Button>,
                ]}
            />
        </PageContainer>
    );
};

export default CloudStorageRecyclePage;
