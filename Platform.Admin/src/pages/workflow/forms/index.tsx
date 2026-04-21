import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Space, Tag, Popconfirm, Input, Empty, Drawer, Form, Input as AntInput, Select, Switch, message, Radio, Upload, Checkbox, List } from 'antd';
const { Group: RadioGroup } = Radio;
import { PageContainer, ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { PlusOutlined, DeleteOutlined, EyeOutlined, SaveOutlined, DragOutlined, CloseOutlined, PartitionOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { CSS } from '@dnd-kit/utilities';

const { TextArea } = AntInput;

interface FormDefinition {
    id?: string;
    name: string;
    key?: string;
    version?: number;
    latestVersionId?: string;
    isActive?: boolean;
    description?: string;
    fields?: FormField[];
    createdAt?: string;
    updatedAt?: string;
}

interface FormVersion {
    id?: string;
    formDefinitionId?: string;
    version?: number;
    name?: string;
    fields?: FormField[];
    isActive?: boolean;
    createdAt?: string;
}

interface FormField {
    id: string;
    label: string;
    type: 'Text' | 'TextArea' | 'Number' | 'Date' | 'DateTime' | 'Select' | 'Radio' | 'Checkbox' | 'Switch' | 'Attachment';
    required: boolean;
    placeholder?: string;
    defaultValue?: string;
    options?: { label: string; value: string }[];
    rules?: { type: string; pattern?: string; message?: string; min?: number; max?: number }[];
    dataKey: string;
}

interface FormStatistics {
    totalForms: number;
    activeForms: number;
}

const FIELD_TYPES = [
    { type: 'Text', label: '文本', icon: 'T' },
    { type: 'TextArea', label: '多行文本', icon: 'T-' },
    { type: 'Number', label: '数字', icon: '#' },
    { type: 'Date', label: '日期', icon: 'D' },
    { type: 'DateTime', label: '日期时间', icon: 'D+' },
    { type: 'Select', label: '下拉选择', icon: 'v' },
    { type: 'Radio', label: '单选', icon: 'O' },
    { type: 'Checkbox', label: '多选', icon: '[]' },
    { type: 'Switch', label: '开关', icon: 'S' },
    { type: 'Attachment', label: '附件上传', icon: 'A' },
];

const api = {
    list: (params: any) => request<ApiResponse<PagedResult<FormDefinition>>>('/apiservice/api/forms', { params }),
    create: (data: Partial<FormDefinition>) => request<ApiResponse<FormDefinition>>('/apiservice/api/forms', { method: 'POST', data }),
    update: (id: string, data: Partial<FormDefinition>) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'DELETE' }),
    statistics: () => request<ApiResponse<FormStatistics>>('/apiservice/api/forms/statistics'),
    getVersions: (formId: string) => request<ApiResponse<FormVersion[]>>(`/apiservice/api/forms/${formId}/versions`),
    getVersion: (versionId: string) => request<ApiResponse<FormVersion>>(`/apiservice/api/forms/version/${versionId}`),
};

function SortableField({ field, selected, onSelect, onDelete }: {
    field: FormField;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const renderFieldPreview = () => {
        switch (field.type) {
            case 'Text': return <AntInput placeholder={field.placeholder} disabled />;
            case 'TextArea': return <TextArea rows={2} placeholder={field.placeholder} disabled />;
            case 'Number': return <AntInput placeholder={field.placeholder} disabled />;
            case 'Date': return <AntInput placeholder={field.placeholder} disabled />;
            case 'DateTime': return <AntInput placeholder={field.placeholder} disabled />;
            case 'Select': return <Select placeholder={field.placeholder} disabled>{field.options?.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}</Select>;
            case 'Radio': return <RadioGroup disabled>{field.options?.map(o => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</RadioGroup>;
            case 'Checkbox': return <Checkbox.Group options={field.options?.map(o => ({ label: o.label, value: o.value }))} disabled />;
            case 'Switch': return <Switch disabled checkedChildren="是" unCheckedChildren="否" />;
            case 'Attachment': return <Upload disabled><Button icon={<UploadOutlined />}>上传附件</Button></Upload>;
            default: return <AntInput placeholder={field.placeholder} disabled />;
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className={`canvas-field ${selected ? 'selected' : ''}`}
            onClick={onSelect}>
            <div className="field-preview-wrapper">
                <div className="field-label-preview">{field.label}{field.required && <span className="required-mark">*</span>}</div>
                {renderFieldPreview()}
            </div>
            <Button type="text" size="small" danger icon={<CloseOutlined />} className="field-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} />
        </div>
    );
}

function FieldPropertyPanel({ field, onChange, onClose }: {
    field: FormField;
    onChange: (field: FormField) => void;
    onClose: () => void;
}) {
    return (
        <div className="field-property-panel">
            <div className="panel-header">
                <span>字段属性</span>
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
            </div>
            <div className="panel-body">
                <div className="property-group">
                    <label>字段标签</label>
                    <AntInput value={field.label} onChange={e => onChange({ ...field, label: e.target.value })} placeholder="请输入字段标签" />
                </div>
                <div className="property-group">
                    <label>数据键</label>
                    <AntInput value={field.dataKey} onChange={e => onChange({ ...field, dataKey: e.target.value })} placeholder="请输入数据键" />
                </div>
                <div className="property-group">
                    <label>字段类型</label>
                    <Select value={field.type} onChange={type => onChange({ ...field, type })} style={{ width: '100%' }}>
                        {FIELD_TYPES.map(t => <Select.Option key={t.type} value={t.type}>{t.label}</Select.Option>)}
                    </Select>
                </div>
                <div className="property-group">
                    <label>必填</label>
                    <Switch checked={field.required} onChange={required => onChange({ ...field, required })} />
                </div>
                <div className="property-group">
                    <label>占位符</label>
                    <AntInput value={field.placeholder} onChange={e => onChange({ ...field, placeholder: e.target.value })} placeholder="请输入占位符" />
                </div>
                {['Select', 'Radio', 'Checkbox'].includes(field.type) && (
                    <div className="property-group">
                        <label>选项 (每行一个: 值,标签)</label>
                        <TextArea
                            value={field.options?.map(o => `${o.value},${o.label}`).join('\n')}
                            onChange={e => {
                                const options = e.target.value.split('\n').filter(Boolean).map(line => {
                                    const [value, label] = line.split(',');
                                    return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' };
                                }).filter(o => o.value);
                                onChange({ ...field, options });
                            }}
                            rows={4}
                            placeholder="option1,选项1&#10;option2,选项2"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

const FormDesigner: React.FC<{ form: FormDefinition; onSave: (form: FormDefinition) => void }> = ({ form, onSave }) => {
    const [fields, setFields] = useState<FormField[]>(form.fields || []);
    const [formData, setFormData] = useState({ name: form.name, version: form.version || 1, isActive: form.isActive ?? true });
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const selectedField = fields.find(f => f.id === selectedFieldId);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = fields.findIndex(f => f.id === active.id);
        const newIndex = fields.findIndex(f => f.id === over.id);
        setFields(arrayMove(fields, oldIndex, newIndex));
    };

    const addField = (type: string) => {
        const fieldType = FIELD_TYPES.find(f => f.type === type)!;
        const newField: FormField = {
            id: `field_${Date.now()}`,
            label: `${fieldType.label}_${fields.length + 1}`,
            type: type as FormField['type'],
            required: false,
            dataKey: `field_${fields.length + 1}`,
            options: type === 'Select' || type === 'Radio' || type === 'Checkbox' ? [{ label: '选项1', value: 'option1' }, { label: '选项2', value: 'option2' }] : undefined,
        };
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
    };

    const updateField = (updated: FormField) => {
        setFields(fields.map(f => f.id === updated.id ? updated : f));
    };

    const deleteField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    const handleSave = () => {
        onSave({ ...form, ...formData, fields });
        message.success('保存成功');
    };

    if (previewMode) {
        return (
            <div className="form-preview">
                <div className="preview-header">
                    <span>预览: {formData.name}</span>
                    <Button icon={<EditOutlined />} onClick={() => setPreviewMode(false)}>编辑</Button>
                </div>
                <Form layout="vertical" style={{ maxWidth: 600, margin: '0 auto' }}>
                    {fields.map(field => (
                        <Form.Item key={field.id} label={field.label} required={field.required}>
                            {field.type === 'Text' && <AntInput placeholder={field.placeholder} />}
                            {field.type === 'TextArea' && <TextArea rows={4} placeholder={field.placeholder} />}
                            {field.type === 'Number' && <AntInput type="number" placeholder={field.placeholder} />}
                            {field.type === 'Date' && <AntInput type="date" placeholder={field.placeholder} />}
                            {field.type === 'DateTime' && <AntInput type="datetime-local" placeholder={field.placeholder} />}
                            {field.type === 'Select' && <Select placeholder={field.placeholder}>{field.options?.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}</Select>}
                            {field.type === 'Radio' && <RadioGroup>{field.options?.map(o => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</RadioGroup>}
                            {field.type === 'Checkbox' && <Checkbox.Group options={field.options?.map(o => ({ label: o.label, value: o.value }))} />}
                            {field.type === 'Switch' && <Switch checkedChildren="是" unCheckedChildren="否" />}
                            {field.type === 'Attachment' && <Upload><Button icon={<UploadOutlined />}>上传附件</Button></Upload>}
                        </Form.Item>
                    ))}
                </Form>
            </div>
        );
    }

    return (
        <div className="form-designer">
            <div className="designer-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 60 }}>表单名称</span>
                    <Input placeholder="请输入表单名称" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: 200 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 40 }}>版本</span>
                    <Input placeholder="版本" type="number" value={formData.version} onChange={e => setFormData({ ...formData, version: parseInt(e.target.value) || 1 })} style={{ width: 80 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 40 }}>启用</span>
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" checked={formData.isActive} onChange={v => setFormData({ ...formData, isActive: v })} />
                </div>
                <Space>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
                    <Button icon={<EyeOutlined />} onClick={() => setPreviewMode(true)}>预览</Button>
                </Space>
            </div>
            <div className="designer-body">
                <div className="field-library">
                    <div className="library-header">字段组件</div>
                    <div className="library-content">
                        {FIELD_TYPES.map(ft => (
                            <div key={ft.type} className="library-item" onClick={() => addField(ft.type)}>
                                <span className="item-icon">{ft.icon}</span>
                                <span className="item-label">{ft.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="form-canvas">
                    <div className="canvas-header">表单画布</div>
                    <div className="canvas-content">
                        {fields.length === 0 ? (
                            <Empty description="从左侧拖拽或点击添加字段" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    {fields.map(field => (
                                        <SortableField key={field.id} field={field} selected={field.id === selectedFieldId}
                                            onSelect={() => setSelectedFieldId(field.id)} onDelete={() => deleteField(field.id)} />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>
                <div className="field-properties" style={{ width: 280, borderLeft: '1px solid #f0f0f0', background: '#fafafa', padding: 12 }}>
                    {selectedField ? (
                        <FieldPropertyPanel field={selectedField} onChange={updateField} onClose={() => setSelectedFieldId(null)} />
                    ) : (
                        <Empty description="选择一个字段进行编辑" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                </div>
            </div>
        </div>
    );
};

const FormDefinitionManagement: React.FC = () => {
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as FormStatistics | null,
        editingForm: null as FormDefinition | null,
        formVisible: false,
        designerVisible: false,
        versions: [] as FormVersion[],
        versionsDrawerVisible: false,
        viewingFormId: null as string | null,
        search: '' as string,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);

    useEffect(() => {
        if (state.viewingFormId) {
            api.getVersions(state.viewingFormId).then(r => { if (r.success && r.data) set({ versions: r.data }); });
        }
    }, [state.viewingFormId]);

    const columns: ProColumns<FormDefinition>[] = [
        { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true },
        { title: '版本', dataIndex: 'version', key: 'version', valueType: 'digit', width: 80, sorter: true },
        { title: '启用', dataIndex: 'isActive', key: 'isActive', render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? '是' : '否'}</Tag> },
        {
            title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 250, render: (_, r) => (
                <Space size={4}>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingFormId: r.id!, versionsDrawerVisible: true })}>查看</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingForm: r, designerVisible: true })}>编辑</Button>
                    <Popconfirm title={`确定删除「${r.name}」？`} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
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

    return (
        <PageContainer>
            <style>{`
                .form-designer { height: calc(100vh - 200px); display: flex; flex-direction: column; }
                .designer-toolbar { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; background: #fff; }
                .designer-body { flex: 1; display: flex; overflow: hidden; }
                .field-library { width: 180px; background: #fff; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; }
                .library-header { padding: 12px 16px; font-weight: 500; border-bottom: 1px solid #f0f0f0; }
                .library-content { flex: 1; padding: 8px; overflow-y: auto; }
                .library-item { display: flex; align-items: center; padding: 8px 12px; margin-bottom: 4px; border-radius: 4px; cursor: pointer; background: #f5f5f5; }
                .library-item:hover { background: #e6f7ff; border-color: #1890ff; }
                .item-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #1890ff; color: #fff; border-radius: 4px; margin-right: 8px; font-size: 12px; }
                .item-label { font-size: 13px; }
                .form-canvas { flex: 1; display: flex; flex-direction: column; background: #fafafa; }
                .canvas-header { padding: 12px 16px; font-weight: 500; border-bottom: 1px solid #f0f0f0; background: #fff; }
                .canvas-content { flex: 1; padding: 16px; overflow-y: auto; }
                .canvas-field { position: relative; padding: 12px 16px; margin-bottom: 8px; background: #fff; border: 1px solid #d9d9d9; border-radius: 8px; cursor: move; transition: all 0.2s; }
                .canvas-field:hover { border-color: #1890ff; }
                .canvas-field.selected { border-color: #1890ff; box-shadow: 0 0 0 2px rgba(24,144,255,0.2); }
                .field-label-preview { font-size: 14px; color: rgba(0,0,0,0.88); font-weight: 400; }
                .required-mark { color: #ff4d4f; margin-left: 4px; }
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
                        <Space><PartitionOutlined />表单设计器</Space>
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
                    <Input.Search key="search" placeholder="搜索..." allowClear value={state.search}
                        onChange={(e) => set({ search: e.target.value })}
                        onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
                        style={{ width: 260, marginRight: 8 }} />,
                    <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingForm: { name: '新表单', version: 1, isActive: true, fields: [] }, designerVisible: true })}>新建表单</Button>,
                ]}
            />

            <Drawer title={state.editingForm?.id ? `编辑表单: ${state.editingForm.name}` : '新建表单'} width="100%" open={state.designerVisible}
                onClose={() => set({ designerVisible: false, editingForm: null })}>
                {state.designerVisible && (
                    <FormDesigner form={state.editingForm || { id: '', name: '新表单', version: 1, isActive: true, fields: [] }} onSave={handleDesignerSave} />
                )}
            </Drawer>

            <Drawer title={`版本历史: ${state.viewingFormId ? state.versions.find(v => v.formDefinitionId === state.viewingFormId)?.name : ''}`} width={600} open={state.versionsDrawerVisible}
                onClose={() => set({ versionsDrawerVisible: false, viewingFormId: null, versions: [] })}>
                {state.versionsDrawerVisible && state.versions.length > 0 && (
                    <List
                        dataSource={state.versions}
                        renderItem={(item) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={`版本 v${item.version}`}
                                    description={`字段数: ${item.fields?.length || 0} | 启用: ${item.isActive ? '是' : '否'} | 创建时间: ${item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '-'}`}
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Drawer>
        </PageContainer>
    );
};

export default FormDefinitionManagement;