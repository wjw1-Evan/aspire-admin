import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Space, Tag, Popconfirm, Input, Drawer, Form, Select, Switch, Modal, Radio, Upload, Checkbox, Empty, App } from 'antd';
const { Group: RadioGroup } = Radio;
import { PageContainer, ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined, RollbackOutlined, PartitionOutlined, UploadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { FormDefinition, FormVersion } from './types';
import { api } from './api';
import { FormDesigner } from './FormDesigner';

interface FormStatistics {
    totalForms: number;
    activeForms: number;
}

const FormDefinitionManagement: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as FormStatistics | null,
        editingForm: null as FormDefinition | null,
        formVisible: false,
        designerVisible: false,
        versions: [] as FormVersion[],
        versionsDrawerVisible: false,
        viewingFormId: null as string | null,
        previewVersionId: null as string | null,
        previewFields: [] as any[],
        search: '' as string,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);

    useEffect(() => {
        if (state.viewingFormId) {
            api.getVersions(state.viewingFormId).then(r => {
                if (r.success && r.data) {
                    const versions = r.data;
                    set({ versions, previewVersionId: versions[0]?.id || null, previewFields: versions[0]?.fields || [] });
                }
            });
        }
    }, [state.viewingFormId]);

    useEffect(() => {
        if (state.designerVisible && state.editingForm?.id) {
            api.get(state.editingForm.id).then(r => {
                if (r.success && r.data) {
                    set({ editingForm: { ...r.data, fields: r.data.fields || [] } });
                }
            });
        }
    }, [state.designerVisible]);

    const columns: ProColumns<FormDefinition>[] = [
        { title: intl.formatMessage({ id: 'pages.forms.table.name' }), dataIndex: 'name', key: 'name', ellipsis: true, sorter: true },
        { title: intl.formatMessage({ id: 'pages.forms.table.version' }), dataIndex: 'version', key: 'version', valueType: 'digit', width: 80, sorter: true },
        { title: intl.formatMessage({ id: 'pages.forms.table.fieldCount' }), dataIndex: 'fields', key: 'fields', valueType: 'digit', width: 80, render: (_, r) => r.fields?.length || 0 },
        { title: intl.formatMessage({ id: 'pages.forms.table.enabled' }), dataIndex: 'isActive', key: 'isActive', render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? intl.formatMessage({ id: 'pages.forms.status.yes' }) : intl.formatMessage({ id: 'pages.forms.status.no' })}</Tag> },
        {
            title: intl.formatMessage({ id: 'pages.forms.table.action' }), key: 'action', valueType: 'option', fixed: 'right', width: 250, render: (_, r) => (
                <Space size={4}>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingFormId: r.id!, versionsDrawerVisible: true })}>{intl.formatMessage({ id: 'pages.forms.action.view' })}</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                        const fields = r.fields?.length ? r.fields : [];
                        set({ editingForm: { ...r, fields: fields || [] }, designerVisible: true });
                    }}>{intl.formatMessage({ id: 'pages.forms.action.edit' })}</Button>
                    <Popconfirm title={intl.formatMessage({ id: 'pages.forms.message.confirmDelete' }, { name: r.name })} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.forms.action.delete' })}</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    const handleDesignerSave = async (form: FormDefinition) => {
        const isNew = !state.editingForm?.id;
        const dataToSave = { name: form.name, version: form.version, isActive: form.isActive, fields: form.fields };
        let res;
        if (isNew) {
            res = await api.create(dataToSave);
        } else {
            res = await api.update(state.editingForm!.id!, dataToSave);
        }
        if (res.success) {
            set({ designerVisible: false, editingForm: null });
            actionRef.current?.reload();
            api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        }
    };

    const handleRollback = (version: FormVersion) => {
        Modal.confirm({
            title: intl.formatMessage({ id: 'pages.forms.action.rollback' }),
            content: intl.formatMessage({ id: 'pages.forms.message.confirmRollback' }, { version: version.version }),
            okText: intl.formatMessage({ id: 'pages.forms.action.confirmRollback' }),
            cancelText: intl.formatMessage({ id: 'pages.forms.action.cancelRollback' }),
            onOk: async () => {
                const currentVersion = state.versions.reduce((max, v) => (v.version ?? 0) > max ? (v.version ?? 0) : max, 0);
                const res = await api.update(state.viewingFormId!, {
                    fields: version.fields,
                    version: currentVersion + 1,
                });
                if (res.success) {
                    message.success(intl.formatMessage({ id: 'pages.forms.message.rollbackSuccess' }));
                    const versionsRes = await api.getVersions(state.viewingFormId!);
                    if (versionsRes.success && versionsRes.data) {
                        const versions = versionsRes.data;
                        set({ versions, previewVersionId: versions[0]?.id || null, previewFields: versions[0]?.fields || [] });
                    }
                    actionRef.current?.reload();
                    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
                }
            },
        });
    };

    return (
        <PageContainer>
            <style>{`
                .form-designer { height: calc(100vh - 200px); display: flex; flex-direction: column; }
                .designer-toolbar { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; background: #fff; }
                .designer-body { flex: 1; display: flex; overflow: hidden; }
                .field-library { width: 180px; background: #fff; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; }
                .library-header { padding: 12px 16px; font-weight: 500; border-bottom: 1px solid #f0f0f0; }
                .library-content { flex: 1; padding: 8px; overflow-y: auto; }
                .library-item { display: flex; align-items: center; padding: 8px 12px; margin-bottom: 4px; border-radius: 4px; cursor: grab; background: #f5f5f5; user-select: none; }
                .library-item:hover { background: #e6f7ff; border-color: #1890ff; }
                .library-item:active { cursor: grabbing; }
                .library-item.dragging { opacity: 0.5; }
                .drag-overlay { z-index: 1000; opacity: 0.85; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
                .canvas-drop-active { background: #e6f7ff !important; outline: 2px dashed #1890ff; outline-offset: -4px; }
                .item-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #1890ff; color: #fff; border-radius: 4px; margin-right: 8px; font-size: 12px; }
                .item-label { font-size: 13px; }
                .form-canvas { flex: 1; display: flex; flex-direction: column; background: #fafafa; }
                .canvas-header { padding: 12px 16px; font-weight: 500; border-bottom: 1px solid #f0f0f0; background: #fff; }
                .canvas-content { flex: 1; padding: 16px; overflow-y: auto; }
                .canvas-field { position: relative; padding: 12px 16px; margin-bottom: 8px; background: #fff; border: 1px solid #d9d9d9; border-radius: 8px; cursor: move; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px; }
                .canvas-field:hover { border-color: #1890ff; }
                .canvas-field.selected { border-color: #1890ff; box-shadow: 0 0 0 2px rgba(24,144,255,0.2); }
                .canvas-field-placeholder { height: 70px; margin-bottom: 8px; border: 2px dashed #1890ff; border-radius: 8px; background: #e6f7ff; animation: pulse 1s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

                .required-mark { color: #ff4d4f;  }
                .field-delete-btn { position: absolute; top: 8px; right: 8px; opacity: 0; transition: opacity 0.2s; }
                .canvas-field:hover .field-delete-btn { opacity: 1; }

                .field-property-panel { height: 100%; }
                .panel-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #d9d9d9; margin-bottom: 12px; font-weight: 500; }
                .property-group { margin-bottom: 12px; }
                .property-group label { display: block; margin-bottom: 4px; font-size: 13px; color: #666; }
                .form-preview { padding: 24px; }
                .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; font-size: 16px; font-weight: 500; }
            `}</style>
            <ProTable
                actionRef={actionRef}
                headerTitle={
                    <Space size={24}>
                        <Space><PartitionOutlined />{intl.formatMessage({ id: 'pages.forms.title' })}</Space>
                        <Space size={12}>
                            <Tag color="blue">{intl.formatMessage({ id: 'pages.forms.statistics.total' })} {state.statistics?.totalForms || 0}</Tag>
                            <Tag color="green">{intl.formatMessage({ id: 'pages.forms.statistics.active' })} {state.statistics?.activeForms || 0}</Tag>
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
                    <Input.Search key="search" placeholder={intl.formatMessage({ id: 'pages.forms.search.placeholder' })} allowClear value={state.search}
                        onChange={(e) => set({ search: e.target.value })}
                        onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
                        style={{ width: 260, marginRight: 8 }} />,
                    <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingForm: { name: intl.formatMessage({ id: 'pages.forms.form.newForm' }), version: 1, isActive: true, fields: [] }, designerVisible: true })}>{intl.formatMessage({ id: 'pages.forms.action.create' })}</Button>,
                ]}
            />

            <Drawer title={state.editingForm?.id ? `${intl.formatMessage({ id: 'pages.forms.form.editForm' })}: ${state.editingForm.name}` : intl.formatMessage({ id: 'pages.forms.form.createForm' })} size="100%" open={state.designerVisible}
                onClose={() => set({ designerVisible: false, editingForm: null })}>
                {state.designerVisible && (
                    <FormDesigner key={state.editingForm?.id || 'new'} form={state.editingForm || { id: '', name: intl.formatMessage({ id: 'pages.forms.form.newForm' }), version: 1, isActive: true, fields: [] }} onSave={handleDesignerSave} intl={intl} />
                )}
            </Drawer>


            <Drawer title={`${intl.formatMessage({ id: 'pages.forms.detail.versionHistory' })}: ${state.viewingFormId ? state.versions.find(v => v.formDefinitionId === state.viewingFormId)?.name : ''}`} size={800} open={state.versionsDrawerVisible}
                onClose={() => set({ versionsDrawerVisible: false, viewingFormId: null, versions: [], previewVersionId: null, previewFields: [] })}>
                <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>{intl.formatMessage({ id: 'pages.forms.detail.versionHistory' })}</div>
                        <div>
                            {state.versions.map(item => (
                                <div key={item.id} style={{
                                    padding: '12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f0f0f0',
                                    background: state.previewVersionId === item.id ? '#e6f7ff' : undefined,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                                    onClick={() => set({ previewVersionId: item.id!, previewFields: item.fields || [] })}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>v{item.version}</div>
                                        <div style={{ fontSize: 12, color: '#666' }}>{item.fields?.length || 0}{intl.formatMessage({ id: 'pages.forms.detail.fieldCount' })} | {item.isActive ? intl.formatMessage({ id: 'pages.forms.status.enabled' }) : intl.formatMessage({ id: 'pages.forms.status.disabled' })}</div>
                                    </div>
                                    <Button type="link" size="small" icon={<RollbackOutlined />} onClick={(e) => { e.stopPropagation(); handleRollback(item); }}>{intl.formatMessage({ id: 'pages.forms.action.rollback' })}</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 2, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>{intl.formatMessage({ id: 'pages.forms.detail.preview' })} {state.previewVersionId ? ` v${state.versions.find(v => v.id === state.previewVersionId)?.version}` : ''}</div>
                        {state.previewFields.length > 0 ? (
                            <Form layout="vertical">
                                {state.previewFields.map((field: any) => (
                                    <Form.Item key={field.id} label={field.label} required={field.required}>
                                        {field.type === 'Text' && <Input placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'TextArea' && <Input.TextArea rows={2} placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'Number' && <Input type="number" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'Date' && <Input type="date" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'DateTime' && <Input type="datetime-local" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'Select' && <Select placeholder={field.placeholder} defaultValue={field.defaultValue}>{field.options?.map((o: any) => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}</Select>}
                                        {field.type === 'Radio' && <RadioGroup defaultValue={field.defaultValue}>{field.options?.map((o: any) => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</RadioGroup>}
                                        {field.type === 'Checkbox' && <Checkbox.Group options={field.options?.map((o: any) => ({ label: o.label, value: o.value }))} defaultValue={field.defaultValue?.split(',').filter(Boolean)} />}
                                        {field.type === 'Switch' && <Switch defaultChecked={field.defaultValue === 'true'} checkedChildren={intl.formatMessage({ id: 'pages.forms.status.yes' })} unCheckedChildren={intl.formatMessage({ id: 'pages.forms.status.no' })} />}
                                        {field.type === 'Attachment' && <Upload><Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.forms.fieldType.upload' })}</Button></Upload>}
                                    </Form.Item>
                                ))}
                            </Form>
                        ) : (
                            <Empty description={intl.formatMessage({ id: 'pages.forms.detail.clickToPreview' })} />
                        )}
                    </div>
                </div>
            </Drawer>
        </PageContainer>
    );
};

export default FormDefinitionManagement;
