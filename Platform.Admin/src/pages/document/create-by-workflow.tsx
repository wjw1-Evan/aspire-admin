import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@/components';
import { Card, Form, Input, Button, Select, DatePicker, InputNumber, Radio, Checkbox, Switch, Upload, Space } from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { PlayCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useIntl, useNavigate, useLocation } from '@umijs/max';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import {
    getWorkflowList,
    getDocumentCreateForm,
    createAndStartDocumentWorkflow,
    type FormDefinition,
    type FormField,
    FormFieldType,
} from '@/services/workflow/api';
import { uploadDocumentAttachment } from '@/services/document/api';

const CreateAndStartByWorkflow: React.FC = () => {
    const intl = useIntl();
    const message = useMessage();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [workflows, setWorkflows] = useState<{ label: string; value: string }[]>([]);
    const [definitionId, setDefinitionId] = useState<string | undefined>();
    const [formDef, setFormDef] = useState<FormDefinition | null>(null);
    const [initialValues, setInitialValues] = useState<Record<string, any>>({});
    const [attachmentFileList, setAttachmentFileList] = useState<UploadFile[]>([]);

    const location = useLocation();
    useEffect(() => {
        (async () => {
            try {
                const resp = await getWorkflowList({ current: 1, pageSize: 100 });
                if (resp.success && resp.data) {
                    const options = (resp.data.list || []).map((wf) => ({ label: wf.name, value: wf.id! }));
                    setWorkflows(options);
                    // 从查询参数预选流程
                    const params = new URLSearchParams(location.search || '');
                    const preDefId = params.get('definitionId') || undefined;
                    if (preDefId) {
                        setDefinitionId(preDefId);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        })();
    }, [location.search]);

    useEffect(() => {
        (async () => {
            if (!definitionId) return;
            try {
                const resp = await getDocumentCreateForm(definitionId);
                if (resp.success) {
                    setFormDef(resp.data?.form || null);
                    const initVals = resp.data?.initialValues || {};
                    setInitialValues(initVals);
                    // 初始化附件 ID 列表
                    form.setFieldsValue({ attachmentIds: [] });
                }
            } catch (e) {
                console.error(e);
            }
        })();
    }, [definitionId]);

    const renderField = (field: FormField) => {
        const common = {
            name: ['values', field.dataKey],
            label: field.label,
            rules: field.required ? [{ required: true, message: intl.formatMessage({ id: 'pages.form.required' }) }] : [],
        } as any;

        switch (field.type) {
            case FormFieldType.Text:
                return (
                    <Form.Item key={field.dataKey} {...common}>
                        <Input placeholder={field.placeholder} />
                    </Form.Item>
                );
            case FormFieldType.TextArea:
                return (
                    <Form.Item key={field.dataKey} {...common}>
                        <Input.TextArea rows={4} placeholder={field.placeholder} />
                    </Form.Item>
                );
            case FormFieldType.Number:
                return (
                    <Form.Item key={field.dataKey} {...common}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                );
            case FormFieldType.Date:
                return (
                    <Form.Item key={field.dataKey} {...common} getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                );
            case FormFieldType.DateTime:
                return (
                    <Form.Item key={field.dataKey} {...common} getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}>
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                );
            case FormFieldType.Select:
                return (
                    <Form.Item key={field.dataKey} {...common}>
                        <Select options={(field.options || []).map(o => ({ label: o.label, value: o.value }))} placeholder={field.placeholder} />
                    </Form.Item>
                );
            case FormFieldType.Radio:
                return (
                    <Form.Item key={field.dataKey} {...common}>
                        <Radio.Group options={(field.options || []).map(o => ({ label: o.label, value: o.value }))} />
                    </Form.Item>
                );
            case FormFieldType.Checkbox:
                return (
                    <Form.Item key={field.dataKey} {...common}>
                        <Checkbox.Group options={(field.options || []).map(o => ({ label: o.label, value: o.value }))} />
                    </Form.Item>
                );
            case FormFieldType.Switch:
                return (
                    <Form.Item key={field.dataKey} {...common} valuePropName="checked">
                        <Switch />
                    </Form.Item>
                );
            case FormFieldType.Attachment:
                return (
                    <Form.Item key={field.dataKey} label={field.label}>
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.document.create.form.uploadButton', defaultMessage: '上传附件' })}</Button>
                        </Upload>
                    </Form.Item>
                );
            default:
                return (
                    <Form.Item key={field.dataKey} {...common}>
                        <Input />
                    </Form.Item>
                );
        }
    };

    const uploadProps: UploadProps = {
        fileList: attachmentFileList,
        multiple: true,
        customRequest: async (options) => {
            const { file, onSuccess, onError } = options;
            try {
                const response = await uploadDocumentAttachment(file as File);
                if (response.success && response.data?.id) {
                    const ids = form.getFieldValue('attachmentIds') || [];
                    form.setFieldsValue({ attachmentIds: [...ids, response.data.id] });

                    const newFile: UploadFile = {
                        uid: response.data.id,
                        name: response.data.name || (file as any).name,
                        status: 'done',
                        url: response.data.url,
                        size: response.data.size,
                        type: response.data.contentType,
                        response,
                    };

                    setAttachmentFileList((prev) => [...prev, newFile]);
                    onSuccess?.(response, file as any);
                } else {
                    const msg = response.message || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
                    message.error(msg);
                    onError?.(new Error(msg));
                }
            } catch (err: any) {
                const msg = err?.message || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
                message.error(msg);
                onError?.(err as Error);
            }
        },
        onRemove: (file) => {
            const currentIds: string[] = form.getFieldValue('attachmentIds') || [];
            const filtered = currentIds.filter((id) => id !== file.uid);
            form.setFieldsValue({ attachmentIds: filtered });
            setAttachmentFileList((prev) => prev.filter((f) => f.uid !== file.uid));
            return true;
        },
    };

    const handleSubmit = async () => {
        try {
            await form.validateFields();
            const values = form.getFieldValue('values') || {};
            // 归一化日期/时间/多选等值，确保传给后端是可序列化的基本类型
            const normalizedValues: Record<string, any> = { ...values };
            if (formDef?.fields?.length) {
                for (const f of formDef.fields) {
                    const key = f.dataKey;
                    const val = values[key];
                    if (val === undefined) continue;
                    switch (f.type) {
                        case FormFieldType.Date:
                        case FormFieldType.DateTime:
                            // Dayjs 转 ISO 字符串
                            normalizedValues[key] = val && (val as any).toISOString ? (val as any).toISOString() : val;
                            break;
                        case FormFieldType.Number:
                            normalizedValues[key] = typeof val === 'string' ? Number(val) : val;
                            break;
                        case FormFieldType.Checkbox:
                            // Checkbox.Group 默认为数组，直接传
                            normalizedValues[key] = Array.isArray(val) ? val : [val];
                            break;
                        default:
                            normalizedValues[key] = val;
                    }
                }
            }
            const attachmentIds: string[] = form.getFieldValue('attachmentIds') || [];
            if (!definitionId) {
                message.error(intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请先选择流程' }));
                return;
            }
            setLoading(true);
            const resp = await createAndStartDocumentWorkflow(definitionId, {
                values: normalizedValues,
                attachmentIds,
            });
            if (resp.success) {
                message.success(intl.formatMessage({ id: 'pages.document.create.message.createSuccess', defaultMessage: '创建并启动成功' }));
                navigate('/document/list');
            }
        } catch (err) {
            console.error(err);
            message.error(intl.formatMessage({ id: 'pages.document.create.message.createFailed', defaultMessage: '创建失败' }));
        } finally {
            setLoading(false);
        }
    };

    const initialFormValues = useMemo(() => ({ values: initialValues, attachmentIds: [] }), [initialValues]);

    return (
        <PageContainer title={intl.formatMessage({ id: 'pages.document.createByWorkflow.title', defaultMessage: '按流程表单创建并启动' })}>
            <Card>
                <Form form={form} layout="vertical" initialValues={initialFormValues}>
                    <Form.Item name="definitionId" label={intl.formatMessage({ id: 'pages.workflow.select', defaultMessage: '选择流程' })} rules={[{ required: true }]}>
                        <Select options={workflows} onChange={(val) => setDefinitionId(val)} allowClear placeholder={intl.formatMessage({ id: 'pages.workflow.select.placeholder', defaultMessage: '请选择流程定义' })} />
                    </Form.Item>

                    {formDef ? (
                        <>
                            {(formDef.fields || []).map((f) => renderField(f))}
                        </>
                    ) : (
                        <div style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.workflow.form.none', defaultMessage: '请选择流程以加载创建表单' })}</div>
                    )}

                    <Form.Item name="attachmentIds" hidden />

                    <Space>
                        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleSubmit} loading={loading}>
                            {intl.formatMessage({ id: 'pages.document.createByWorkflow.submit', defaultMessage: '创建并启动' })}
                        </Button>
                        <Button onClick={() => navigate('/document/list')}>{intl.formatMessage({ id: 'pages.button.cancel' })}</Button>
                    </Space>
                </Form>
            </Card>
        </PageContainer>
    );
};

export default CreateAndStartByWorkflow;
