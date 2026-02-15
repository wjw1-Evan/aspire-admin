import React from 'react';
import { Modal, Select, Form, Input, InputNumber, DatePicker, Radio, Checkbox, Switch, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { FormFieldType, type FormDefinition } from '@/services/workflow/api';
import { type FormInstance } from 'antd/es/form';
import { type UploadProps } from 'antd/es/upload';

interface DocumentCreateModalProps {
    visible: boolean;
    isFormStep: boolean;
    nextStepLoading: boolean;
    onOk: () => void;
    onCancel: () => void;
    workflows: any[];
    selectedWorkflowId: string;
    onWorkflowChange: (value: string) => void;
    workflowFormDef: FormDefinition | null;
    workflowInitialValues: Record<string, any>;
    wfForm: FormInstance;
    wfUploadProps: UploadProps;
}

const DocumentCreateModal: React.FC<DocumentCreateModalProps> = ({
    visible,
    isFormStep,
    nextStepLoading,
    onOk,
    onCancel,
    workflows,
    selectedWorkflowId,
    onWorkflowChange,
    workflowFormDef,
    workflowInitialValues,
    wfForm,
    wfUploadProps,
}) => {
    const intl = useIntl();

    return (
        <Modal
            title={isFormStep ? intl.formatMessage({ id: 'pages.document.create.title.fillForm', defaultMessage: '填写流程表单' }) : intl.formatMessage({ id: 'pages.document.create.title' })}
            open={visible}
            okText={isFormStep ? intl.formatMessage({ id: 'pages.document.create.submit', defaultMessage: '提交' }) : intl.formatMessage({ id: 'pages.document.create.next', defaultMessage: '下一步' })}
            confirmLoading={nextStepLoading}
            onOk={onOk}
            onCancel={onCancel}
            mask={{ closable: false }}
            width={720}
        >
            {!isFormStep ? (
                <div>
                    <div style={{ marginBottom: 8 }}>
                        {intl.formatMessage({ id: 'pages.document.create.nextStep.tip', defaultMessage: '请选择流程，下一步将在模态窗体内填写流程自定义表单并创建/启动流程。' })}
                    </div>
                    <Select
                        style={{ width: '100%' }}
                        placeholder={intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' })}
                        value={selectedWorkflowId || undefined}
                        onChange={onWorkflowChange}
                    >
                        {workflows
                            .filter((w) => w.isActive)
                            .map((workflow) => (
                                <Select.Option key={workflow.id} value={workflow.id}>
                                    {workflow.name}
                                </Select.Option>
                            ))}
                    </Select>
                </div>
            ) : (
                <Form form={wfForm} layout="vertical" initialValues={{ values: workflowInitialValues, attachmentIds: [] }}>
                    {(workflowFormDef?.fields || []).map((f) => {
                        const common = {
                            name: ['values', f.dataKey],
                            label: f.label,
                            rules: f.required ? [{ required: true, message: intl.formatMessage({ id: 'pages.form.required' }) }] : [],
                        } as any;

                        switch (f.type) {
                            case FormFieldType.Text:
                                return (
                                    <Form.Item key={f.dataKey} {...common}>
                                        <Input placeholder={f.placeholder} />
                                    </Form.Item>
                                );
                            case FormFieldType.TextArea:
                                return (
                                    <Form.Item key={f.dataKey} {...common}>
                                        <Input.TextArea rows={4} placeholder={f.placeholder} />
                                    </Form.Item>
                                );
                            case FormFieldType.Number:
                                return (
                                    <Form.Item key={f.dataKey} {...common}>
                                        <InputNumber style={{ width: '100%' }} />
                                    </Form.Item>
                                );
                            case FormFieldType.Date:
                                return (
                                    <Form.Item key={f.dataKey} {...common} getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}>
                                        <DatePicker style={{ width: '100%' }} />
                                    </Form.Item>
                                );
                            case FormFieldType.DateTime:
                                return (
                                    <Form.Item key={f.dataKey} {...common} getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}>
                                        <DatePicker showTime style={{ width: '100%' }} />
                                    </Form.Item>
                                );
                            case FormFieldType.Select:
                                return (
                                    <Form.Item key={f.dataKey} {...common}>
                                        <Select options={(f.options || []).map(o => ({ label: o.label, value: o.value }))} placeholder={f.placeholder} />
                                    </Form.Item>
                                );
                            case FormFieldType.Radio:
                                return (
                                    <Form.Item key={f.dataKey} {...common}>
                                        <Radio.Group options={(f.options || []).map(o => ({ label: o.label, value: o.value }))} />
                                    </Form.Item>
                                );
                            case FormFieldType.Checkbox:
                                return (
                                    <Form.Item key={f.dataKey} {...common}>
                                        <Checkbox.Group options={(f.options || []).map(o => ({ label: o.label, value: o.value }))} />
                                    </Form.Item>
                                );
                            case FormFieldType.Switch:
                                return (
                                    <Form.Item key={f.dataKey} {...common} valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                );
                            case FormFieldType.Attachment:
                                return (
                                    <Form.Item key={f.dataKey} label={f.label}>
                                        <Upload {...wfUploadProps}>
                                            <Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.document.create.form.uploadButton', defaultMessage: '上传附件' })}</Button>
                                        </Upload>
                                    </Form.Item>
                                );
                            default:
                                return (
                                    <Form.Item key={f.dataKey} {...common}>
                                        <Input />
                                    </Form.Item>
                                );
                        }
                    })}

                    <Form.Item name="attachmentIds" hidden />
                </Form>
            )}
        </Modal>
    );
};

export default DocumentCreateModal;
