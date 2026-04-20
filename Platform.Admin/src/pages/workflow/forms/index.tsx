import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Space, Tag, Popconfirm, Input } from 'antd';
import { PageContainer, ModalForm, ProTable, ProColumns, ActionType, ProFormText, ProFormDigit, ProFormSwitch } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, PartitionOutlined, SearchOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types';

interface FormDefinition { id?: string; name: string; key: string; version?: number; isActive?: boolean; createdAt?: string; updatedAt?: string; }
interface FormStatistics { totalForms: number; activeForms: number; }

const api = {
    list: (params: any) => request<ApiResponse<PagedResult<FormDefinition>>>('/apiservice/api/forms', { params }),
    create: (data: Partial<FormDefinition>) => request<ApiResponse<FormDefinition>>('/apiservice/api/forms', { method: 'POST', data }),
    update: (id: string, data: Partial<FormDefinition>) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'DELETE' }),
    statistics: () => request<ApiResponse<FormStatistics>>('/apiservice/api/forms/statistics'),
};

const FormDefinitionManagement: React.FC = () => {
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as FormStatistics | null,
        editingForm: null as FormDefinition | null,
        formVisible: false,
        search: '' as string,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);

    const columns: ProColumns<FormDefinition>[] = [
        { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true },
        { title: '键', dataIndex: 'key', key: 'key', ellipsis: true, sorter: true },
        { title: '版本', dataIndex: 'version', key: 'version', valueType: 'digit', width: 80, sorter: true },
        { title: '启用', dataIndex: 'isActive', key: 'isActive', valueType: 'select', fieldProps: { options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? '是' : '否'}</Tag> },
        {
            title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
                <Space size={4}>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingForm: r, formVisible: true })}>编辑</Button>
                    <Popconfirm title={`确定删除「${r.name}」？`} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <PageContainer>
            <ProTable
                actionRef={actionRef}
                headerTitle={
                    <Space size={24}>
                        <Space><PartitionOutlined />表单管理</Space>
                        <Space size={12}>
                            <Tag color="blue">总计 {state.statistics?.totalForms || 0}</Tag>
                            <Tag color="green">启用 {state.statistics?.activeForms || 0}</Tag>
                        </Space>
                    </Space>
                }
                rowKey="id"
                search={false}
                scroll={{ x: 'max-content' }}
                request={async (params: any, sort: any, filter: any) => {
                    const { current, pageSize } = params;
                    const res = await api.list({ page: current, pageSize, search: state.search, sort, filter });
                    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
                    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
                }}
                columns={columns}
                toolBarRender={() => [
                    <Input.Search
                        key="search"
                        placeholder="搜索..."
                        allowClear
                        value={state.search}
                        onChange={(e) => set({ search: e.target.value })}
                        onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
                        style={{ width: 260, marginRight: 8 }}
                    />,
                    <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingForm: null, formVisible: true })}>新建表单</Button>,
                ]}
            />

            <ModalForm
                key={state.editingForm?.id || 'create'}
                width={600}
                open={state.formVisible}
                title={state.editingForm ? '编辑表单' : '新建表单'}
                onOpenChange={(open) => { if (!open) set({ formVisible: false, editingForm: null }); }}
                initialValues={state.editingForm ? { name: state.editingForm.name, key: state.editingForm.key, version: state.editingForm.version, isActive: state.editingForm.isActive } : { version: 1, isActive: true }}
                onFinish={async (values) => {
                    const data = { name: values.name, key: values.key, version: values.version, isActive: values.isActive };
                    const res = state.editingForm ? await api.update(state.editingForm.id!, data) : await api.create(data);
                    if (res.success) { set({ formVisible: false, editingForm: null }); actionRef.current?.reload(); }
                    return res.success;
                }}
            >
                <ProFormText name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]} placeholder="请输入表单名称" />
                <ProFormText name="key" label="键" rules={[{ required: true, message: '请输入键' }]} placeholder="请输入表单键" />
                <ProFormDigit name="version" label="版本" rules={[{ required: true, message: '请输入版本' }]} min={1} placeholder="请输入版本号" />
                <ProFormSwitch name="isActive" label="启用" />
            </ModalForm>
        </PageContainer>
    );
};

export default FormDefinitionManagement;
