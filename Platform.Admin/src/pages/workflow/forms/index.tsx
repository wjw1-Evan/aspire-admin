import React, { useEffect, useRef, useState } from 'react';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, Switch, Space, Select, Divider, Card, Grid, Row, Col, DatePicker, Radio, Checkbox, Upload } from 'antd';
import { PartitionOutlined, PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { PageContainer } from '@/components';
import {
    getFormList,
    createForm,
    updateForm,
    deleteForm,
    FormDefinition,
    FormField,
    FormFieldType,
    FormFieldOption,
} from '@/services/form/api';

const FIELD_TEMPLATES: { label: string; type: FormFieldType; desc?: string; supportOptions?: boolean }[] = [
    { label: '单行文本', type: FormFieldType.Text, desc: '输入单行文本' },
    { label: '多行文本', type: FormFieldType.TextArea, desc: '输入多行描述' },
    { label: '数字', type: FormFieldType.Number, desc: '输入数字值' },
    { label: '日期', type: FormFieldType.Date, desc: '选择日期' },
    { label: '日期时间', type: FormFieldType.DateTime, desc: '选择日期与时间' },
    { label: '下拉选择', type: FormFieldType.Select, desc: '从选项中选择', supportOptions: true },
    { label: '单选', type: FormFieldType.Radio, desc: '选择一个选项', supportOptions: true },
    { label: '多选', type: FormFieldType.Checkbox, desc: '选择多个选项', supportOptions: true },
    { label: '开关', type: FormFieldType.Switch, desc: '布尔开关' },
    { label: '附件', type: FormFieldType.Attachment, desc: '上传文件' },
];

const createField = (type: FormFieldType): FormField => {
    const base: FormField = {
        label: `字段_${type}`,
        type,
        dataKey: `${type}_${Date.now()}`,
        required: false,
    };
    if ([FormFieldType.Select, FormFieldType.Radio, FormFieldType.Checkbox].includes(type)) {
        return {
            ...base,
            options: [
                { label: '选项1', value: 'option_1' },
                { label: '选项2', value: 'option_2' },
            ],
        };
    }
    return base;
};

const FieldEditor: React.FC<{
    value?: FormField[];
    onChange?: (val: FormField[]) => void;
}> = ({ value = [], onChange }) => {
    const [fields, setFields] = useState<FormField[]>(value);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const normalizeType = (t: any): FormFieldType => {
        const key = String(t || '').toLowerCase();
        switch (key) {
            case 'text':
                return FormFieldType.Text;
            case 'textarea':
                return FormFieldType.TextArea;
            case 'number':
                return FormFieldType.Number;
            case 'date':
                return FormFieldType.Date;
            case 'datetime':
                return FormFieldType.DateTime;
            case 'select':
                return FormFieldType.Select;
            case 'radio':
                return FormFieldType.Radio;
            case 'checkbox':
                return FormFieldType.Checkbox;
            case 'switch':
                return FormFieldType.Switch;
            case 'attachment':
                return FormFieldType.Attachment;
            default:
                return FormFieldType.Text;
        }
    };

    useEffect(() => {
        const normalized = (value || []).map((f) => ({ ...f, type: normalizeType(f.type) }));
        setFields(normalized);
    }, [value]);

    const update = (next: FormField[]) => {
        setFields(next);
        onChange?.(next);
    };

    const isOptionType = (type: FormFieldType) => [FormFieldType.Select, FormFieldType.Radio, FormFieldType.Checkbox].includes(normalizeType(type));

    const addFieldFromType = (type: FormFieldType) => {
        update([...fields, createField(normalizeType(type))]);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const fieldType = e.dataTransfer.getData('field-type') as FormFieldType;
        if (fieldType) {
            addFieldFromType(fieldType);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleCardDragStart = (idx: number, e: React.DragEvent<HTMLDivElement>) => {
        setDragIndex(idx);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleCardDragEnter = (idx: number) => {
        if (dragIndex === null || dragIndex === idx) return;
        const next = fields.slice();
        const [item] = next.splice(dragIndex, 1);
        next.splice(idx, 0, item);
        setDragIndex(idx);
        update(next);
    };

    const handleCardDragEnd = () => {
        setDragIndex(null);
    };

    const addOption = (idx: number) => {
        const target = fields[idx];
        const options = target.options || [];
        updateField(idx, {
            options: [...options, { label: `选项${options.length + 1}`, value: `option_${options.length + 1}` }],
        });
    };

    const updateOption = (idx: number, optIdx: number, patch: Partial<FormFieldOption>) => {
        const target = fields[idx];
        const options: FormFieldOption[] = target.options ? [...target.options] : [];
        options[optIdx] = { ...options[optIdx], ...patch } as FormFieldOption;
        updateField(idx, { options });
    };

    const removeOption = (idx: number, optIdx: number) => {
        const target = fields[idx];
        const options: FormFieldOption[] = target.options ? [...target.options] : [];
        options.splice(optIdx, 1);
        updateField(idx, { options });
    };

    const updateField = (idx: number, patch: Partial<FormField>) => {
        const next = fields.slice();
        next[idx] = { ...next[idx], ...patch };
        update(next);
    };

    const removeField = (idx: number) => {
        const next = fields.slice();
        next.splice(idx, 1);
        update(next);
    };

    const renderPreviewControl = (f: FormField) => {
        const optionItems = (f.options || []).map((o) => ({ label: o.label, value: o.value }));
        const type = normalizeType(f.type);
        switch (type) {
            case FormFieldType.Text:
                return <Input placeholder={f.placeholder} defaultValue={f.defaultValue as any} />;
            case FormFieldType.TextArea:
                return <Input.TextArea placeholder={f.placeholder} defaultValue={f.defaultValue as any} />;
            case FormFieldType.Number:
                return <Input type="number" placeholder={f.placeholder} defaultValue={f.defaultValue as any} />;
            case FormFieldType.Date:
                return <DatePicker style={{ width: '100%' }} />;
            case FormFieldType.DateTime:
                return <DatePicker showTime style={{ width: '100%' }} />;
            case FormFieldType.Select:
                return <Select allowClear options={optionItems} placeholder={f.placeholder} defaultValue={f.defaultValue as any} />;
            case FormFieldType.Radio:
                return <Radio.Group options={optionItems} defaultValue={f.defaultValue as any} />;
            case FormFieldType.Checkbox:
                return <Checkbox.Group options={optionItems} defaultValue={f.defaultValue as any} />;
            case FormFieldType.Switch:
                return <Switch defaultChecked={!!f.defaultValue} />;
            case FormFieldType.Attachment:
                return (
                    <Upload.Dragger name="files" multiple style={{ padding: 8 }} disabled>
                        <p className="ant-upload-drag-icon">📎</p>
                        <p className="ant-upload-text">附件上传预览</p>
                    </Upload.Dragger>
                );
            default:
                return <Input placeholder={f.placeholder} defaultValue={f.defaultValue as any} />;
        }
    };

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(160px, 200px) 1fr',
                gap: 16,
                overflowX: 'auto',
            }}
        >
            <div style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>字段组件</div>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {FIELD_TEMPLATES.map((tpl) => (
                        <div
                            key={tpl.type}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('field-type', tpl.type);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onClick={() => addFieldFromType(tpl.type)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #e5e5e5',
                                borderRadius: 6,
                                background: '#fff',
                                cursor: 'grab',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div style={{ fontWeight: 500 }}>{tpl.label}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{tpl.desc}</div>
                            {tpl.supportOptions && (
                                <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>含选项</div>
                            )}
                        </div>
                    ))}
                </Space>
                <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>拖拽到右侧区域，或点击卡片快速添加</div>
            </div>

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                    minHeight: 200,
                    border: '1px dashed #d9d9d9',
                    borderRadius: 8,
                    padding: 12,
                    background: '#fff',
                }}
            >
                {fields.length === 0 && (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>
                        拖拽左侧组件到此处以创建表单字段
                    </div>
                )}

                {fields.map((f, idx) => (
                    <div
                        key={f.dataKey || idx}
                        draggable
                        onDragStart={(e) => handleCardDragStart(idx, e)}
                        onDragEnter={() => handleCardDragEnter(idx)}
                        onDragEnd={handleCardDragEnd}
                        style={{
                            padding: 12,
                            border: '1px solid #eee',
                            borderRadius: 6,
                            marginBottom: 8,
                            background: dragIndex === idx ? '#f6ffed' : '#fafafa',
                            cursor: 'move',
                        }}
                    >
                        <Space align="center" style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                                <span style={{ fontWeight: 500 }}>{f.label || '未命名字段'}</span>
                                <span style={{ color: '#999' }}>{f.type}</span>
                            </Space>
                            <Space>
                                <Switch checked={!!f.required} onChange={(v) => updateField(idx, { required: v })} size="small" />
                                <Button danger size="small" onClick={() => removeField(idx)}>删除</Button>
                            </Space>
                        </Space>

                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Space wrap>
                                <Input
                                    style={{ width: 200 }}
                                    placeholder="标签"
                                    value={f.label}
                                    onChange={(e) => updateField(idx, { label: e.target.value })}
                                />
                                <Select
                                    style={{ width: 160 }}
                                    value={f.type}
                                    onChange={(val) => updateField(idx, { type: val as FormFieldType })}
                                    options={Object.values(FormFieldType).map((t) => ({ label: t, value: t }))}
                                />
                                <Input
                                    style={{ width: 200 }}
                                    placeholder="数据键 dataKey"
                                    value={f.dataKey}
                                    onChange={(e) => updateField(idx, { dataKey: e.target.value })}
                                />
                            </Space>
                            <Input
                                placeholder="占位符"
                                value={f.placeholder}
                                onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                            />
                            <Input
                                placeholder="默认值（文本）"
                                value={f.defaultValue as any}
                                onChange={(e) => updateField(idx, { defaultValue: e.target.value })}
                            />

                            {isOptionType(f.type) && (
                                <div style={{ padding: 8, background: '#fff', borderRadius: 6, border: '1px dashed #e5e5e5' }}>
                                    <Space orientation="vertical" style={{ width: '100%' }}>
                                        {(f.options || []).map((opt, optIdx) => (
                                            <Space key={optIdx} align="baseline">
                                                <Input
                                                    style={{ width: 160 }}
                                                    placeholder="选项标签"
                                                    value={opt.label}
                                                    onChange={(e) => updateOption(idx, optIdx, { label: e.target.value })}
                                                />
                                                <Input
                                                    style={{ width: 160 }}
                                                    placeholder="选项值"
                                                    value={opt.value}
                                                    onChange={(e) => updateOption(idx, optIdx, { value: e.target.value })}
                                                />
                                                <Button danger onClick={() => removeOption(idx, optIdx)}>删除</Button>
                                            </Space>
                                        ))}
                                        <Button type="dashed" onClick={() => addOption(idx)}>添加选项</Button>
                                    </Space>
                                </div>
                            )}
                        </Space>
                    </div>
                ))}
            </div>

            <div style={{ gridColumn: '1 / span 2' }}>
                <Divider orientation="left" style={{ margin: '12px 0' }}>实时预览</Divider>
                <Card size="small" bordered bodyStyle={{ background: '#fff' }}>
                    {fields.length === 0 ? (
                        <div style={{ color: '#999' }}>暂无字段，添加后可即时预览表单效果</div>
                    ) : (
                        <Form layout="vertical" disabled>
                            {fields.map((f) => (
                                <Form.Item key={f.dataKey} label={f.label} required={!!f.required}>
                                    {renderPreviewControl(f)}
                                </Form.Item>
                            ))}
                        </Form>
                    )}
                </Card>
            </div>
        </div>
    );
};

const { useBreakpoint } = Grid;

const FormsPage: React.FC = () => {
    const actionRef = useRef<ActionType | null>(null);
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<FormDefinition | null>(null);
    const [form] = Form.useForm<FormDefinition>();
    const [searchForm] = Form.useForm();
    const message = useMessage();
    const [searchParams, setSearchParams] = useState<{ current: number; pageSize: number; keyword?: string; isActive?: boolean }>(
        { current: 1, pageSize: 10, keyword: '', isActive: undefined }
    );

    const columns: ProColumns<FormDefinition>[] = [
        { title: '名称', dataIndex: 'name', ellipsis: true },
        { title: '键', dataIndex: 'key', ellipsis: true },
        { title: '版本', dataIndex: 'version', width: 80 },
        { title: '启用', dataIndex: 'isActive', width: 80, render: (_, r) => (r.isActive ? '是' : '否') },
        {
            title: '操作',
            valueType: 'option',
            render: (_, record) => [
                <Button
                    key="edit"
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                        setEditing(record);
                        setOpen(true);
                        form.setFieldsValue(record);
                    }}
                >
                    编辑
                </Button>,
                <Button
                    key="del"
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                        const res = await deleteForm(record.id!);
                        if (res.success) {
                            message.success('已删除');
                            actionRef.current?.reload();
                        } else {
                            message.error('删除失败');
                        }
                    }}
                >
                    删除
                </Button>,
            ],
        },
    ];

    const handleSearch = (values: any) => {
        const next = {
            ...searchParams,
            current: 1,
            keyword: values.keyword || '',
            isActive: values.isActive,
        };
        setSearchParams(next);
        actionRef.current?.reload?.();
    };

    const handleReset = () => {
        searchForm.resetFields();
        const reset = { current: 1, pageSize: searchParams.pageSize, keyword: '', isActive: undefined };
        setSearchParams(reset);
        actionRef.current?.reload?.();
    };

    const handleRefresh = () => {
        actionRef.current?.reload?.();
    };

    return (
        <PageContainer
            title={
                <Space>
                    <PartitionOutlined />
                    表单定义
                </Space>
            }
            style={{ paddingBlock: 12 }}
            extra={
                <Space wrap>
                    <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
                        刷新
                    </Button>
                    <Button
                        key="create"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => { setEditing(null); setOpen(true); form.resetFields(); }}
                    >
                        新建表单
                    </Button>
                </Space>
            }
        >

            <Card style={{ marginBottom: 16 }}>
                <Form
                    form={searchForm}
                    layout={isMobile ? 'vertical' : 'inline'}
                    onFinish={handleSearch}
                    style={{ marginBottom: 16 }}
                >
                    <Form.Item name="keyword" label="关键词">
                        <Input placeholder="名称、描述等" allowClear style={{ width: isMobile ? '100%' : 240 }} />
                    </Form.Item>
                    <Form.Item name="isActive" label="状态">
                        <Select
                            allowClear
                            placeholder="选择状态"
                            style={{ width: isMobile ? '100%' : 150 }}
                            options={[
                                { label: '启用', value: true },
                                { label: '禁用', value: false },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space wrap>
                            <Button type="primary" htmlType="submit" style={isMobile ? { width: '100%' } : {}}>搜索</Button>
                            <Button onClick={handleReset} style={isMobile ? { width: '100%' } : {}}>重置</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>

            <ProTable<FormDefinition>
                actionRef={actionRef}
                rowKey="id"
                search={false}
                cardBordered
                options={false}
                toolBarRender={false}
                columns={columns}
                pagination={{
                    defaultPageSize: 10,
                    pageSizeOptions: [10, 20, 50, 100],
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                }}
                scroll={{ x: 'max-content' }}
                request={async (params) => {
                    const res = await getFormList({
                        current: params.current || searchParams.current,
                        pageSize: params.pageSize || searchParams.pageSize,
                        keyword: searchParams.keyword,
                        isActive: searchParams.isActive,
                    });
                    return {
                        data: res.data?.list || [],
                        total: res.data?.total || 0,
                        success: res.success,
                    };
                }}
            />

            <Modal
                width={1200}
                open={open}
                destroyOnHidden
                title={editing ? '编辑表单' : '新建表单'}
                onCancel={() => setOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setOpen(false)}>取消</Button>,
                    <Button
                        key="ok"
                        type="primary"
                        onClick={async () => {
                            const values = await form.validateFields();
                            const payload: Partial<FormDefinition> = {
                                ...values,
                                key: values.key || `form_${Date.now()}`,
                                version: values.version || 1,
                                isActive: values.isActive ?? true,
                            };
                            let res;
                            if (editing?.id) {
                                res = await updateForm(editing.id, payload);
                            } else {
                                res = await createForm(payload);
                            }
                            if (res.success) {
                                message.success('已保存');
                                setOpen(false);
                                actionRef.current?.reload();
                            } else {
                                message.error('保存失败');
                            }
                        }}
                    >
                        保存
                    </Button>,
                ]}
                styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
            >
                <Form form={form} layout="vertical">
                    <Card size="small" title="基础信息" bordered style={{ marginBottom: 12 }}>
                        <Row gutter={[12, 12]}>
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <Form.Item name="key" label="键">
                                    <Input placeholder="可留空自动生成" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <Form.Item name="version" label="版本" initialValue={1}>
                                    <Input type="number" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item name="description" label="描述">
                                    <Input.TextArea rows={2} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    <Card
                        size="small"
                        title="字段编辑"
                        bordered
                        bodyStyle={{ background: '#f6ffed', borderRadius: 6 }}
                        extra={<span style={{ color: '#52c41a' }}>拖拽或点击左侧组件添加字段</span>}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <div style={{ color: '#666' }}>设计表单字段，支持拖拽排序、选项编辑与必填设置。</div>
                            <Divider style={{ margin: '8px 0' }} />
                            <Form.Item
                                name="fields"
                                label="字段列表"
                                rules={[{ required: true, message: '请添加字段' }]}
                                getValueFromEvent={(v) => v}
                                valuePropName="value"
                                style={{ marginBottom: 0 }}
                            >
                                <FieldEditor />
                            </Form.Item>
                        </Space>
                    </Card>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default FormsPage;
