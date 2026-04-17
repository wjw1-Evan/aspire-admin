import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Space, Tag, App, Modal, Input, Popconfirm } from 'antd';
import { ShareAltOutlined, EditOutlined, DeleteOutlined, CopyOutlined, LockOutlined, UnlockOutlined, SearchOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDatePicker, ProFormDigit, ProFormSwitch } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, ProTableRequest } from '@/types';

interface FileShare { id: string; fileId: string; fileName: string; shareToken: string; shareType: 'internal' | 'external'; accessType: 'view' | 'download' | 'edit'; password: string; expiresAt?: string; maxDownloads?: number; isEnabled: boolean; createdAt: string; createdBy?: string; createdByName?: string; }

const api = {
    getMyShares: (params: ProTableRequest) => request<ApiResponse<PagedResult<any>>>('/apiservice/api/file-share/my-shares', { params }),
    getSharedWithMe: (params: ProTableRequest) => request<ApiResponse<PagedResult<any>>>('/apiservice/api/file-share/shared-with-me', { params }),
    update: (id: string, data: any) => request<ApiResponse<void>>(`/apiservice/api/file-share/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/file-share/${id}`, { method: 'DELETE' }),
};

const CloudStorageSharedPage: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'my-shares' | 'shared-with-me'>('my-shares');
    const [editingShare, setEditingShare] = useState<FileShare | null>(null);
    const [searchText, setSearchText] = useState('');

    const handleOpenModal = (share: FileShare) => {
        setEditingShare(share);
    };

    const handleEditSave = async (values: any) => {
        try {
            await api.update(editingShare!.id, { ...values, expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined });
            message.success('更新成功');
            return true;
        } catch { message.error('更新失败'); return false; }
    };

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
        { title: '下载次数限制', dataIndex: 'maxDownloads', key: 'maxDownloads', valueType: 'digit', sorter: true },
        { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', valueType: 'dateTime', sorter: true },
        {
            title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 180,
            render: (_, r: FileShare) => (
                <Space size={4}>
                    <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => {
                        const url = `${window.location.origin}/share/${r.shareToken}`;
                        navigator.clipboard.writeText(url);
                        message.success('分享链接已复制');
                    }}>复制链接</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(r)}>编辑</Button>
                    <Button type="link" size="small" icon={r.isEnabled ? <LockOutlined /> : <UnlockOutlined />} onClick={async () => { try { await api.update(r.id, { isEnabled: !r.isEnabled }); message.success(`${r.isEnabled ? '禁用' : '启用'}成功`); } catch { message.error('操作失败'); } }}>{r.isEnabled ? '禁用' : '启用'}</Button>
                    <Popconfirm title={`确定删除分享「${r.fileName}」？`} onConfirm={async () => { try { await api.delete(r.id); message.success('删除成功'); } catch { message.error('删除失败'); } }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <PageContainer>
            <ProTable
                headerTitle={
            <Space size={24}>
              <Space><ShareAltOutlined />我的分享</Space>
              <Space size={12}>
                <Tag color="blue">总计 0</Tag>
                <Tag color="green">启用 0</Tag>
                <Tag color="orange">已禁用 0</Tag>
              </Space>
            </Space>
          }
                actionRef={actionRef}
                rowKey="id"
                search={false}
                request={async (params: any, sort: any, filter: any) => {
                    const res = activeTab === 'my-shares' ? await api.getMyShares({ ...params, search: searchText, sort, filter }) : await api.getSharedWithMe({ ...params, search: searchText, sort, filter });
                    if (res.success && res.data) {
                        const transformed = (res.data.queryable || []).map(transformShare);
                        return { data: transformed, total: res.data.rowCount || 0, success: true };
                    }
                    return { data: [], total: 0, success: false };
                }}
                columns={columns}
                scroll={{ x: 'max-content' }}
                toolbar={{
                    menu: { type: 'tab', activeKey: activeTab, onChange: (key) => setActiveTab(key as any) },
                }}
                toolBarRender={() => [
                  <Input.Search
                    key="search"
                    placeholder="搜索..."
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onSearch={(value) => { setSearchText(value); actionRef.current?.reload(); }}
                    style={{ width: 260 }}
                    prefix={<SearchOutlined />}
                  />,
                ]}
            />
            <ModalForm
                title="编辑分享"
                open={!!editingShare}
                onOpenChange={(visible) => { if (!visible) setEditingShare(null); }}
                onFinish={handleEditSave}
                width={600}
                initialValues={editingShare ? { accessType: editingShare.accessType, password: editingShare.password, expiresAt: editingShare.expiresAt ? dayjs(editingShare.expiresAt) : undefined, maxDownloads: editingShare.maxDownloads, isEnabled: editingShare.isEnabled } : undefined}
            >
                <ProFormSelect name="accessType" label="访问权限" rules={[{ required: true }]} options={[{ label: '仅查看', value: 'view' }, { label: '查看和下载', value: 'download' }, { label: '查看、下载和编辑', value: 'edit' }]} />
                <ProFormText name="password" label="访问密码" placeholder="设置访问密码（可选）" />
                <ProFormDatePicker name="expiresAt" label="过期时间" placeholder="设置过期时间（可选）" />
                <ProFormDigit name="maxDownloads" label="下载次数限制" min={1} placeholder="设置最大下载次数（可选）" />
                <ProFormSwitch name="isEnabled" label="启用状态" />
            </ModalForm>
        </PageContainer>
    );
};

export default CloudStorageSharedPage;
