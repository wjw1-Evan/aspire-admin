import React, { useState } from 'react';
import { PageContainer } from '@/components';
import { Button, Space, Tag, Card, Modal, Form, Input, DatePicker, Switch, App, Select } from 'antd';
import { ShareAltOutlined, EditOutlined, DeleteOutlined, CopyOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, PageParams } from '@/types';

interface FileShare { id: string; fileId: string; fileName: string; shareToken: string; shareType: 'internal' | 'external'; accessType: 'view' | 'download' | 'edit'; password: string; expiresAt?: string; maxDownloads?: number; downloadCount: number; accessCount: number; isEnabled: boolean; createdAt: string; createdBy?: string; createdByName?: string; }

const api = {
    getMyShares: (params: PageParams) => request<ApiResponse<PagedResult<any>>>('/api/cloud-storage/share/my-shares', { params }),
    getSharedWithMe: (params: PageParams) => request<ApiResponse<PagedResult<any>>>('/api/cloud-storage/share/shared-with-me', { params }),
    update: (id: string, data: any) => request<ApiResponse<void>>(`/api/cloud-storage/share/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<void>>(`/api/cloud-storage/share/${id}`, { method: 'DELETE' }),
    toggle: (id: string, enabled: boolean) => request<ApiResponse<void>>(`/api/cloud-storage/share/${id}/toggle`, { method: 'POST', data: { enabled } }),
};

const CloudStorageSharedPage: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [activeTab, setActiveTab] = useState<'my-shares' | 'shared-with-me'>('my-shares');
    const [editingShare, setEditingShare] = useState<FileShare | null>(null);

    const mapShareType = (type: any): 'internal' | 'external' => {
        if (typeof type === 'string') return type.toLowerCase() === 'internal' ? 'internal' : 'external';
        return type === 1 ? 'internal' : 'external';
    };
    const mapAccessType = (permission: any): 'view' | 'download' | 'edit' => {
        if (typeof permission === 'number') { if (permission === 1) return 'download'; if (permission >= 2) return 'edit'; return 'view'; }
        const lower = typeof permission === 'string' ? permission.toLowerCase() : '';
        if (lower === 'download') return 'download'; if (lower === 'edit' || lower === 'full') return 'edit'; return 'view';
    };
    const transformShare = (item: any): FileShare => ({
        id: item.id, fileId: item.fileItemId, fileName: item.fileName || item.fileItemName || item.fileItemId || '未知文件',
        shareToken: item.shareToken, shareType: mapShareType(item.type), accessType: mapAccessType(item.permission),
        password: item.password || '', expiresAt: item.expiresAt,
        maxDownloads: typeof item.settings?.maxDownloads === 'number' ? item.settings.maxDownloads : (typeof item.maxDownloads === 'number' ? item.maxDownloads : undefined),
        downloadCount: item.downloadCount || item.accessCount || 0, accessCount: item.accessCount || 0,
        isEnabled: item.isActive !== undefined ? item.isActive : item.isEnabled,
        createdAt: item.createdAt, createdBy: item.createdBy, createdByName: item.createdByName || item.createdByUsername || '',
    });

    const getAccessTypeTag = (accessType: string) => {
        const m: Record<string, { color: string; text: string }> = { view: { color: 'blue', text: '查看' }, download: { color: 'green', text: '下载' }, edit: { color: 'orange', text: '编辑' } };
        const c = m[accessType] || { color: 'default', text: accessType };
        return <Tag color={c.color}>{c.text}</Tag>;
    };

    const columns: ProColumns<FileShare>[] = [
        { title: '文件名', dataIndex: 'fileName', key: 'fileName', sorter: true, copyable: true },
        { title: '分享类型', dataIndex: 'shareType', key: 'shareType', valueType: 'select', valueEnum: { internal: '内部', external: '外部' }, renderText: (t: string) => <Tag color={t === 'internal' ? 'blue' : 'green'}>{t === 'internal' ? '内部' : '外部'}</Tag> },
        { title: '访问权限', dataIndex: 'accessType', key: 'accessType', valueType: 'select', valueEnum: { view: '查看', download: '下载', edit: '编辑' }, renderText: (t: string) => getAccessTypeTag(t) },
        { title: '状态', dataIndex: 'isEnabled', key: 'isEnabled', valueType: 'select', valueEnum: { enabled: '有效', disabled: '禁用' }, renderText: (t: boolean, r: FileShare) => {
            if (!r.isEnabled) return <Tag color="default">已禁用</Tag>;
            if (r.expiresAt && dayjs(r.expiresAt).isBefore(dayjs())) return <Tag color="red">已过期</Tag>;
            return <Tag color="green">有效</Tag>;
        }},
        { title: '访问次数', dataIndex: 'accessCount', key: 'accessCount', valueType: 'digit', sorter: true },
        { title: '下载次数', dataIndex: 'downloadCount', key: 'downloadCount', valueType: 'digit', sorter: true },
        { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', valueType: 'dateTime', sorter: true },
        {
            title: '操作', key: 'action', fixed: 'right', valueType: 'option',
            render: (_, r: FileShare) => (
                <Space>
                    <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => {
                        const url = `${window.location.origin}/share/${r.shareToken}`;
                        navigator.clipboard.writeText(url);
                        message.success('分享链接已复制');
                    }}>复制链接</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                        setEditingShare(r);
                        form.setFieldsValue({ accessType: r.accessType, password: r.password, expiresAt: r.expiresAt ? dayjs(r.expiresAt) : undefined, maxDownloads: r.maxDownloads, isEnabled: r.isEnabled });
                    }}>编辑</Button>
                    <Button type="link" size="small" icon={r.isEnabled ? <LockOutlined /> : <UnlockOutlined />} onClick={async () => {
                        try {
                            await api.toggle(r.id, !r.isEnabled);
                            message.success(`${r.isEnabled ? '禁用' : '启用'}成功`);
                        } catch { message.error('操作失败'); }
                    }}>{r.isEnabled ? '禁用' : '启用'}</Button>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                        Modal.confirm({ title: '确认删除', content: `确定要删除分享 "${r.fileName}" 吗？`, okText: '删除', okType: 'danger', onOk: async () => {
                            try { await api.delete(r.id); message.success('删除成功'); } catch { message.error('删除失败'); }
                        }});
                    }}>删除</Button>
                </Space>
            )
        },
    ];

    return (
        <PageContainer title={<Space><ShareAltOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.shared.title' })}</Space>}>
            <ProTable
                headerTitle={intl.formatMessage({ id: 'pages.cloud-storage.shared.title' })}
                rowKey="id"
                search={{ labelWidth: 'auto' }}
                request={async (params: any) => {
                    const { current, pageSize, ...rest } = params;
                    const res = activeTab === 'my-shares' ? await api.getMyShares({ page: current, pageSize, ...rest } as PageParams) : await api.getSharedWithMe({ page: current, pageSize, ...rest } as PageParams);
                    if (res.success && res.data) {
                        const transformed = (res.data.queryable || []).map(transformShare);
                        return { data: transformed, total: res.data.rowCount || 0, success: true };
                    }
                    return { data: [], total: 0, success: false };
                }}
                columns={columns}
                scroll={{ x: 'max-content' }}
                toolbar={{ menu: { type: 'tab', activeKey: activeTab, onChange: (key) => setActiveTab(key as any) } }}
            />
            <Modal title="编辑分享" open={!!editingShare} onCancel={() => setEditingShare(null)} onOk={async () => {
                try {
                    const values = form.getFieldsValue();
                    await api.update(editingShare!.id, { ...values, expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined });
                    message.success('更新成功');
                    setEditingShare(null);
                } catch { message.error('更新失败'); }
            }} width={600}>
                <Form form={form} layout="vertical">
                    <Form.Item name="accessType" label="访问权限" rules={[{ required: true }]}>
                        <Select><Select.Option value="view">仅查看</Select.Option><Select.Option value="download">查看和下载</Select.Option><Select.Option value="edit">查看、下载和编辑</Select.Option></Select>
                    </Form.Item>
                    <Form.Item name="password" label="访问密码"><Input.Password placeholder="设置访问密码（可选）" /></Form.Item>
                    <Form.Item name="expiresAt" label="过期时间"><DatePicker showTime placeholder="设置过期时间（可选）" style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="maxDownloads" label="下载次数限制"><Input type="number" placeholder="设置最大下载次数（可选）" min={1} /></Form.Item>
                    <Form.Item name="isEnabled" label="启用状态" valuePropName="checked"><Switch /></Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default CloudStorageSharedPage;
