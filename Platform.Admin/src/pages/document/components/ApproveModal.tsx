/**
 * ApproveModal - 审批通过弹窗
 */

import React from 'react';
import { Modal, Form, Input, Card } from 'antd';
import { useIntl } from '@umijs/max';
import type { ApproveModalProps } from './types';
import DynamicFormFields from './DynamicFormFields';

const { TextArea } = Input;

const ApproveModal: React.FC<ApproveModalProps> = ({
    open,
    onCancel,
    loading,
    nodeFormDef,
    nodeFormInitialValues,
    onSubmit,
}) => {
    const intl = useIntl();
    const [form] = Form.useForm();

    React.useEffect(() => {
        if (open) {
            form.setFieldsValue({ nodeValues: nodeFormInitialValues, comment: undefined });
        }
    }, [open, nodeFormInitialValues, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            onSubmit(values);
        } catch (e) {
            // 校验失败
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={intl.formatMessage({ id: 'pages.document.approval.modal.approveTitle' })}
            open={open}
            onOk={handleOk}
            confirmLoading={loading}
            onCancel={handleCancel}
        >
            <Form form={form} layout="vertical" initialValues={{ nodeValues: nodeFormInitialValues }}>
                {nodeFormDef && nodeFormDef.fields?.length > 0 && (
                    <Card
                        size="small"
                        style={{ marginBottom: 12 }}
                        title={intl.formatMessage({ id: 'pages.document.approval.modal.nodeForm', defaultMessage: '审批表单' })}
                    >
                        <DynamicFormFields formDef={nodeFormDef} namePrefix="nodeValues" />
                    </Card>
                )}
                <Form.Item name="comment" label={intl.formatMessage({ id: 'pages.document.approval.modal.approveComment' })}>
                    <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.approveCommentPlaceholder' })} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ApproveModal;
