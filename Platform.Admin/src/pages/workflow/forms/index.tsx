import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Space, Tag, Popconfirm, Input, Empty, Drawer, Form, Input as AntInput, Select, Switch, message, Radio, Upload, Checkbox } from 'antd';
const { Group: RadioGroup } = Radio;
import { PageContainer, ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { PlusOutlined, DeleteOutlined, EyeOutlined, SaveOutlined, DragOutlined, CloseOutlined, PartitionOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { CSS } from '@dnd-kit/utilities';

const { TextArea } = AntInput;

const LIBRARY_PREFIX = 'lib_';

function DraggableLibraryItem({ ft }: { ft: typeof FIELD_TYPES[number] }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${LIBRARY_PREFIX}${ft.type}`,
        data: { type: ft.type, fromLibrary: true },
    });
    return (
        <div ref={setNodeRef} {...attributes} {...listeners}
            className={`library-item ${isDragging ? 'dragging' : ''}`}>
            <span className="item-icon">{ft.icon}</span>
            <span className="item-label">{ft.label}</span>
        </div>
    );
}

function DroppableCanvas({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' });
    return (
        <div ref={setNodeRef} className={`canvas-content ${isOver ? 'canvas-drop-active' : ''}`}>
            {children}
        </div>
    );
}

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

const FIELD_TYPE_MAP: Record<string, FormField['type']> = {
    text: 'Text', textarea: 'TextArea', number: 'Number',
    date: 'Date', datetime: 'DateTime', select: 'Select',
    radio: 'Radio', checkbox: 'Checkbox', switch: 'Switch', attachment: 'Attachment',
};

const normalizeFieldType = (t: string | undefined): FormField['type'] => {
    if (!t) return 'Text';
    return FIELD_TYPE_MAP[t.toLowerCase()] || (t as FormField['type']);
};

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
    get: (id: string) => request<ApiResponse<FormDefinition>>(`/apiservice/api/forms/${id}`),
    create: (data: Partial<FormDefinition>) => request<ApiResponse<FormDefinition>>('/apiservice/api/forms', { method: 'POST', data }),
    update: (id: string, data: Partial<FormDefinition>) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'DELETE' }),
    statistics: () => request<ApiResponse<FormStatistics>>('/apiservice/api/forms/statistics'),
    getVersions: (formId: string) => request<ApiResponse<FormVersion[]>>(`/apiservice/api/forms/${formId}/versions`),
    getVersion: (versionId: string) => request<ApiResponse<FormVersion>>(`/apiservice/api/forms/version/${versionId}`),
};

function SortableField({ field, selected, onSelect, onDelete, onChange }: {
    field: FormField;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onChange?: (field: FormField) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const renderFieldPreview = () => {
        const handleChange = (val: string) => onChange?.({ ...field, defaultValue: val });
        switch (normalizeFieldType(field.type)) {
            case 'Text': return <AntInput placeholder={field.placeholder} value={field.defaultValue} onChange={e => handleChange(e.target.value)} />;
            case 'TextArea': return <TextArea rows={2} placeholder={field.placeholder} value={field.defaultValue} onChange={e => handleChange(e.target.value)} />;
            case 'Number': return <AntInput type="number" placeholder={field.placeholder} value={field.defaultValue} onChange={e => handleChange(e.target.value)} />;
            case 'Date': return <AntInput type="date" placeholder={field.placeholder} value={field.defaultValue} onChange={e => handleChange(e.target.value)} />;
            case 'DateTime': return <AntInput type="datetime-local" placeholder={field.placeholder} value={field.defaultValue} onChange={e => handleChange(e.target.value)} />;
            case 'Select': return <Select placeholder={field.placeholder} value={field.defaultValue} onChange={val => handleChange(val)}>{field.options?.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}</Select>;
            case 'Radio': return <RadioGroup value={field.defaultValue} onChange={e => handleChange(e.target.value)}>{field.options?.map(o => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</RadioGroup>;
            case 'Checkbox': return <Checkbox.Group options={field.options?.map(o => ({ label: o.label, value: o.value }))} value={field.defaultValue?.split(',').filter(Boolean)} onChange={val => handleChange(val?.join(','))} />;
            case 'Switch': return <Switch checked={field.defaultValue === 'true'} onChange={val => handleChange(String(val))} checkedChildren="是" unCheckedChildren="否" />;
            case 'Attachment': return <Upload><Button icon={<UploadOutlined />}>上传附件</Button></Upload>;
            default: return <AntInput placeholder={field.placeholder} value={field.defaultValue} onChange={e => handleChange(e.target.value)} />;
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className={`canvas-field ${selected ? 'selected' : ''}`}
            onClick={onSelect}>
            <div  >
                <div style={{ marginBottom: 10 }} >{field.required && <span className="required-mark">*</span>} {field.label}</div>
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
                <div className="property-group">
                    <label>默认值</label>
                    <AntInput value={field.defaultValue} onChange={e => onChange({ ...field, defaultValue: e.target.value })} placeholder="请输入默认值" />
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
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    useEffect(() => {
        const normalized = (form.fields || []).map(f => ({ ...f, type: normalizeFieldType(f.type) }));
        setFields(normalized);
        setFormData({ name: form.name, version: form.version || 1, isActive: form.isActive ?? true });
        setSelectedFieldId(null);
        setPreviewMode(false);
        setActiveId(null);
        setOverId(null);
    }, [form]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const selectedField = fields.find(f => f.id === selectedFieldId);

    const createField = (type: string): FormField => {
        const fieldType = FIELD_TYPES.find(f => f.type === type)!;
        return {
            id: `field_${Date.now()}`,
            label: `${fieldType.label}_${fields.length + 1}`,
            type: type as FormField['type'],
            required: false,
            dataKey: `field_${fields.length + 1}`,
            options: type === 'Select' || type === 'Radio' || type === 'Checkbox' ? [{ label: '选项1', value: 'option1' }, { label: '选项2', value: 'option2' }] : undefined,
        };
    };

    const addField = (type: string) => {
        const newField = createField(type);
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const activeId = event.active.id as string;
        setActiveId(activeId);

        const isFromLibrary = activeId.startsWith(LIBRARY_PREFIX);
        if (isFromLibrary) {
            const fieldType = activeId.replace(LIBRARY_PREFIX, '');
            const tempId = `temp_${Date.now()}`;
            const tempField: FormField = {
                id: tempId,
                label: FIELD_TYPES.find(f => f.type === fieldType)?.label || '新字段',
                type: fieldType as FormField['type'],
                required: false,
                dataKey: '',
            };
            setFields(prev => [...prev, tempField]);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) {
            setOverId(null);
            return;
        }
        const isFromLibrary = String(active.id).startsWith(LIBRARY_PREFIX);
        if (!isFromLibrary) {
            setOverId(null);
            return;
        }
        const overId = String(over.id);
        if (overId === 'canvas-droppable' || overId.startsWith('field_')) {
            setOverId(overId);
        } else {
            setOverId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setOverId(null);

        if (!over) {
            setFields(prev => prev.filter(f => !f.id.startsWith('temp_')));
            return;
        }

        const isFromLibrary = String(active.id).startsWith(LIBRARY_PREFIX);

        if (isFromLibrary) {
            const tempField = fields.find(f => f.id.startsWith('temp_'));
            if (!tempField) return;

            const targetId = String(over.id);
            const fieldType = String(active.id).replace(LIBRARY_PREFIX, '');
            const finalField: FormField = {
                ...tempField,
                id: `field_${Date.now()}`,
                type: fieldType as FormField['type'],
                label: `${FIELD_TYPES.find(f => f.type === fieldType)?.label || '字段'}_${fields.length + 1}`,
                dataKey: `field_${fields.length + 1}`,
                options: fieldType === 'Select' || fieldType === 'Radio' || fieldType === 'Checkbox'
                    ? [{ label: '选项1', value: 'option1' }, { label: '选项2', value: 'option2' }] : undefined,
            };

            setFields(prev => {
                const filtered = prev.filter(f => f.id !== tempField.id);
                if (targetId === 'canvas-droppable') {
                    return [...filtered, finalField];
                }
                const overIndex = filtered.findIndex(f => f.id === targetId);
                if (overIndex >= 0) {
                    return [...filtered.slice(0, overIndex), finalField, ...filtered.slice(overIndex)];
                }
                return [...filtered, finalField];
            });
            setSelectedFieldId(finalField.id);
            return;
        }

        if (active.id !== over.id && String(over.id).startsWith('field_')) {
            setFields(prev => {
                const oldIndex = prev.findIndex(f => f.id === active.id);
                const newIndex = prev.findIndex(f => f.id === over.id);
                if (oldIndex >= 0 && newIndex >= 0) {
                    return arrayMove(prev, oldIndex, newIndex);
                }
                return prev;
            });
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
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
                            {field.type === 'Text' && <AntInput placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                            {field.type === 'TextArea' && <TextArea rows={4} placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                            {field.type === 'Number' && <AntInput type="number" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                            {field.type === 'Date' && <AntInput type="date" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                            {field.type === 'DateTime' && <AntInput type="datetime-local" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                            {field.type === 'Select' && <Select placeholder={field.placeholder} defaultValue={field.defaultValue}>{field.options?.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}</Select>}
                            {field.type === 'Radio' && <RadioGroup defaultValue={field.defaultValue}>{field.options?.map(o => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</RadioGroup>}
                            {field.type === 'Checkbox' && <Checkbox.Group options={field.options?.map(o => ({ label: o.label, value: o.value }))} defaultValue={field.defaultValue?.split(',').filter(Boolean)} />}
                            {field.type === 'Switch' && <Switch defaultChecked={field.defaultValue === 'true'} checkedChildren="是" unCheckedChildren="否" />}
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
                    <span style={{ width: 40 }}>启用</span>
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" checked={formData.isActive} onChange={v => setFormData({ ...formData, isActive: v })} />
                </div>
                <Space>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
                    <Button icon={<EyeOutlined />} onClick={() => setPreviewMode(true)}>预览</Button>
                </Space>
            </div>
            <div className="designer-body">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className="field-library">
                        <div className="library-header">字段组件</div>
                        <div className="library-content">
                            {FIELD_TYPES.map(ft => (
                                <DraggableLibraryItem key={ft.type} ft={ft} />
                            ))}
                        </div>
                    </div>
                    <div className="form-canvas">
                        <div className="canvas-header">表单画布</div>
                        <DroppableCanvas>
                            {fields.length === 0 ? (
                                <Empty description="从左侧拖拽或点击添加字段" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    {fields.map((field, index) => (
                                        <React.Fragment key={field.id}>
                                            {overId === field.id && index > 0 && <div className="canvas-field-placeholder" />}
                                            <SortableField field={field} selected={field.id === selectedFieldId}
                                                onSelect={() => setSelectedFieldId(field.id)} onDelete={() => deleteField(field.id)} onChange={updateField} />
                                        </React.Fragment>
                                    ))}
                                    {overId === 'canvas-droppable' && fields.length > 0 && <div className="canvas-field-placeholder" />}
                                </SortableContext>
                            )}
                        </DroppableCanvas>
                    </div>
                    <DragOverlay>
                        {activeId && String(activeId).startsWith(LIBRARY_PREFIX) ? (
                            <div className="library-item drag-overlay">
                                <span className="item-icon">{FIELD_TYPES.find(f => `${LIBRARY_PREFIX}${f.type}` === activeId)?.icon}</span>
                                <span className="item-label">{FIELD_TYPES.find(f => `${LIBRARY_PREFIX}${f.type}` === activeId)?.label}</span>
                            </div>
                        ) : activeId ? (
                            <div className="canvas-field drag-overlay">
                                {(() => {
                                    const f = fields.find(x => x.id === activeId);
                                    return f ? <div  ><div  >{f.label}</div></div> : null;
                                })()}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
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
        previewVersionId: null as string | null,
        previewFields: [] as FormField[],
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
        { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true },
        { title: '版本', dataIndex: 'version', key: 'version', valueType: 'digit', width: 80, sorter: true },
        { title: '字段数', dataIndex: 'fields', key: 'fields', valueType: 'digit', width: 80, render: (_, r) => r.fields?.length || 0 },
        { title: '启用', dataIndex: 'isActive', key: 'isActive', render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? '是' : '否'}</Tag> },
        {
            title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 250, render: (_, r) => (
                <Space size={4}>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingFormId: r.id!, versionsDrawerVisible: true })}>查看</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                        const fields = r.fields?.length ? r.fields : [];
                        set({ editingForm: { ...r, fields: fields || [] }, designerVisible: true });
                    }}>编辑</Button>
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

            <Drawer title={state.editingForm?.id ? `编辑表单: ${state.editingForm.name}` : '新建表单'} size="100%" open={state.designerVisible}
                onClose={() => set({ designerVisible: false, editingForm: null })}>
                {state.designerVisible && (
                    <FormDesigner key={state.editingForm?.id || 'new'} form={state.editingForm || { id: '', name: '新表单', version: 1, isActive: true, fields: [] }} onSave={handleDesignerSave} />
                )}
            </Drawer>


            <Drawer title={`版本历史: ${state.viewingFormId ? state.versions.find(v => v.formDefinitionId === state.viewingFormId)?.name : ''}`} size={800} open={state.versionsDrawerVisible}
                onClose={() => set({ versionsDrawerVisible: false, viewingFormId: null, versions: [], previewVersionId: null, previewFields: [] })}>
                <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>历史版本</div>
                        <div>
                            {state.versions.map(item => (
                                <div key={item.id} style={{
                                    padding: '12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f0f0f0',
                                    background: state.previewVersionId === item.id ? '#e6f7ff' : undefined
                                }}
                                    onClick={() => set({ previewVersionId: item.id!, previewFields: item.fields || [] })}>
                                    <div style={{ fontWeight: 500 }}>v{item.version}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>{item.fields?.length || 0}个字段 | {item.isActive ? '启用' : '禁用'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 2, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>表单预览 {state.previewVersionId ? ` v${state.versions.find(v => v.id === state.previewVersionId)?.version}` : ''}</div>
                        {state.previewFields.length > 0 ? (
                            <Form layout="vertical">
                                {state.previewFields.map(field => (
                                    <Form.Item key={field.id} label={field.label} required={field.required}>
                                        {field.type === 'Text' && <AntInput placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'TextArea' && <TextArea rows={2} placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'Number' && <AntInput type="number" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'Date' && <AntInput type="date" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'DateTime' && <AntInput type="datetime-local" placeholder={field.placeholder} defaultValue={field.defaultValue} />}
                                        {field.type === 'Select' && <Select placeholder={field.placeholder} defaultValue={field.defaultValue}>{field.options?.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}</Select>}
                                        {field.type === 'Radio' && <RadioGroup defaultValue={field.defaultValue}>{field.options?.map(o => <Radio key={o.value} value={o.value}>{o.label}</Radio>)}</RadioGroup>}
                                        {field.type === 'Checkbox' && <Checkbox.Group options={field.options?.map(o => ({ label: o.label, value: o.value }))} defaultValue={field.defaultValue?.split(',').filter(Boolean)} />}
                                        {field.type === 'Switch' && <Switch defaultChecked={field.defaultValue === 'true'} checkedChildren="是" unCheckedChildren="否" />}
                                        {field.type === 'Attachment' && <Upload><Button icon={<UploadOutlined />}>上传</Button></Upload>}
                                    </Form.Item>
                                ))}
                            </Form>
                        ) : (
                            <Empty description="点击左侧版本查看预览" />
                        )}
                    </div>
                </div>
            </Drawer>
        </PageContainer>
    );
};

export default FormDefinitionManagement;
