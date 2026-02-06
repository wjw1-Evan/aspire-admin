/**
 * RejectModal - 拒绝弹窗
 */

import React from 'react';
import { Modal, Form, Input } from 'antd';
import { useIntl } from '@umijs/max';
import type { RejectModalProps } from './types';

const { TextArea } = Input;

const RejectModal: React.FC<RejectModalProps> = ({
    open,
    onCancel,
    loading,
    onSubmit,
}) => {
    const intl = useIntl();
    const [form] = Form.useForm();

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
            title={intl.formatMessage({ id: 'pages.document.approval.modal.rejectTitle' })}
            open={open}
            onOk={handleOk}
            confirmLoading={loading}
            onCancel={handleCancel}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="comment"
                    label={intl.formatMessage({ id: 'pages.document.approval.modal.rejectReason' })}
                    rules={[
                        {
                            required: true,
                            message: intl.formatMessage({ id: 'pages.document.approval.modal.rejectReasonRequired' }),
                        },
                    ]}
                >
                    <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.rejectReasonPlaceholder' })} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default RejectModal;
