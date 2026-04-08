import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space, Upload, Button } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import {
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormDigit,
  ProFormDatePicker,
  ProFormDateTimePicker,
  ProFormRadio,
  ProFormCheckbox,
  ProFormSwitch,
  ProFormItem,
} from '@ant-design/pro-form';
import { useMessage } from '@/hooks/useMessage';
import { PlayCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useIntl, useNavigate, useLocation } from '@umijs/max';
import dayjs from 'dayjs';
import {
    getWorkflowList,
    getDocumentCreateForm,
    createAndStartDocumentWorkflow,
    type FormDefinition,
    type FormField,
    FormFieldType,
} from '@/services/workflow/api';

const CreateAndStartByWorkflow: React.FC = () => {
    const intl = useIntl();
    const message = useMessage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [workflows, setWorkflows] = useState<{ label: string; value: string }[]>([]);
    const [definitionId, setDefinitionId] = useState<string | undefined>();
    const [formDef, setFormDef] = useState<FormDefinition | null>(null);
    const [initialValues, setInitialValues] = useState<Record<string, any>>({});

    const location = useLocation();
    useEffect(() => {
        (async () => {
            try {
                const resp = await getWorkflowList({ page: 1 });
                if (resp.success && resp.data) {
                    const options = (resp.data.queryable || []).map((wf) => ({ label: wf.name, value: wf.id! }));
                    setWorkflows(options);
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
                }
            } catch (e) {
                console.error(e);
            }
        })();
    }, [definitionId]);

    const renderField = (field: FormField) => {
        const name = ['values', field.dataKey] as const;
        const label = field.label;
        const rules = field.required ? [{ required: true, message: intl.formatMessage({ id: 'pages.form.required' }) }] : [];

        switch (field.type) {
            case FormFieldType.Text:
                return (
                    <ProFormText
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        placeholder={field.placeholder}
                    />
                );
            case FormFieldType.TextArea:
                return (
                    <ProFormTextArea
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        placeholder={field.placeholder}
                        rows={4}
                    />
                );
            case FormFieldType.Number:
                return (
                    <ProFormDigit
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        fieldProps={{ style: { width: '100%' } }}
                    />
                );
            case FormFieldType.Date:
                return (
                    <ProFormDatePicker
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        fieldProps={{ style: { width: '100%' } }}
                    />
                );
            case FormFieldType.DateTime:
                return (
                    <ProFormDateTimePicker
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        fieldProps={{ style: { width: '100%' } }}
                    />
                );
            case FormFieldType.Select:
                return (
                    <ProFormSelect
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        options={(field.options || []).map(o => ({ label: o.label, value: o.value }))}
                        placeholder={field.placeholder}
                    />
                );
            case FormFieldType.Radio:
                return (
                    <ProFormRadio.Group
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        options={(field.options || []).map(o => ({ label: o.label, value: o.value }))}
                    />
                );
            case FormFieldType.Checkbox:
                return (
                    <ProFormCheckbox.Group
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        options={(field.options || []).map(o => ({ label: o.label, value: o.value }))}
                    />
                );
            case FormFieldType.Switch:
                return (
                    <ProFormSwitch
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                        valuePropName="checked"
                    />
                );
            case FormFieldType.Attachment:
                return (
                    <ProFormItem
                        key={field.dataKey}
                        name={['values', field.dataKey]}
                        label={label}
                    >
                        <Upload
                            name="files"
                            multiple
                            maxCount={10}
                            action="/apiservice/api/upload"
                            listType="text"
                        >
                            <Button icon={<UploadOutlined />}>
                                {intl.formatMessage({ id: 'pages.document.create.form.uploadButton', defaultMessage: '上传附件' })}
                            </Button>
                        </Upload>
                    </ProFormItem>
                );
            default:
                return (
                    <ProFormText
                        key={field.dataKey}
                        name={name}
                        label={label}
                        rules={rules}
                    />
                );
        }
    };

    const handleSubmit = async (values: Record<string, any>) => {
        try {
            const formValues = values.values || {};
            const normalizedValues: Record<string, any> = { ...formValues };
            if (formDef?.fields?.length) {
                for (const f of formDef.fields) {
                    const key = f.dataKey;
                    const val = formValues[key];
                    if (val === undefined) continue;
                    switch (f.type) {
                        case FormFieldType.Date:
                        case FormFieldType.DateTime:
                            normalizedValues[key] = val && (val as any).toISOString ? (val as any).toISOString() : val;
                            break;
                        case FormFieldType.Number:
                            normalizedValues[key] = typeof val === 'string' ? Number(val) : val;
                            break;
                        case FormFieldType.Checkbox:
                            normalizedValues[key] = Array.isArray(val) ? val : [val];
                            break;
                        default:
                            normalizedValues[key] = val;
                    }
                }
            }
            if (!definitionId) {
                message.error(intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请先选择流程' }));
                return false;
            }
            setLoading(true);
            const attachmentIds: string[] = (values.attachmentIds || []).map((file: any) => file.response?.data?.id || file.uid);
            const resp = await createAndStartDocumentWorkflow(definitionId, {
                values: normalizedValues,
                attachmentIds,
            });
            if (resp.success) {
                message.success(intl.formatMessage({ id: 'pages.document.create.message.createSuccess', defaultMessage: '创建并启动成功' }));
                navigate('/document/list');
                return true;
            }
            return false;
        } catch (err) {
            console.error(err);
            message.error(intl.formatMessage({ id: 'pages.document.create.message.createFailed', defaultMessage: '创建失败' }));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const initialFormValues = useMemo(() => ({ values: initialValues }), [initialValues]);

    return (
        <PageContainer>
            <ProCard>
                <ProForm
                    layout="vertical"
                    initialValues={initialFormValues}
                    submitter={{
                        searchConfig: {
                            submitText: intl.formatMessage({ id: 'pages.document.createByWorkflow.submit', defaultMessage: '创建并启动' }),
                            resetText: intl.formatMessage({ id: 'pages.button.cancel' }),
                        },
                        submitButtonProps: {
                            icon: <PlayCircleOutlined />,
                        },
                        onReset: () => {
                            navigate('/document/list');
                        },
                    }}
                    onFinish={handleSubmit}
                >
                    <ProFormSelect
                        name="definitionId"
                        label={intl.formatMessage({ id: 'pages.workflow.select', defaultMessage: '选择流程' })}
                        rules={[{ required: true }]}
                        options={workflows}
                        onChange={(val) => setDefinitionId(val as string)}
                        allowClear
                        placeholder={intl.formatMessage({ id: 'pages.workflow.select.placeholder', defaultMessage: '请选择流程定义' })}
                        initialValue={definitionId}
                    />

                    {formDef ? (
                        <>
                            {(formDef.fields || []).map((f) => renderField(f))}
                        </>
                    ) : (
                        <div style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.workflow.form.none', defaultMessage: '请选择流程以加载创建表单' })}</div>
                    )}

                    <ProFormItem
                        name="attachmentIds"
                        label={intl.formatMessage({ id: 'pages.document.create.form.attachments', defaultMessage: '附件' })}
                    >
                        <Upload
                            name="files"
                            multiple
                            maxCount={10}
                            action="/apiservice/api/upload"
                            listType="text"
                        >
                            <Button icon={<UploadOutlined />}>
                                {intl.formatMessage({ id: 'pages.document.create.form.uploadButton', defaultMessage: '上传附件' })}
                            </Button>
                        </Upload>
                    </ProFormItem>
                </ProForm>
            </ProCard>
        </PageContainer>
    );
};

export default CreateAndStartByWorkflow;
