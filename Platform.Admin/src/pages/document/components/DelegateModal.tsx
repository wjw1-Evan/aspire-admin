/**
 * DelegateModal - 转办弹窗
 */

import React from 'react';
import { Modal, Form, Input, Select } from 'antd';
import { useIntl } from '@umijs/max';
import type { DelegateModalProps } from './types';

const { TextArea } = Input;

const DelegateModal: React.FC<DelegateModalProps> = ({
    open,
    onCancel,
    loading,
    users,
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
            title={intl.formatMessage({ id: 'pages.document.approval.modal.delegateTitle' })}
            open={open}
            onOk={handleOk}
            confirmLoading={loading}
            onCancel={handleCancel}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="delegateToUserId"
                    label={intl.formatMessage({ id: 'pages.document.approval.modal.delegateUser' })}
                    rules={[
                        {
                            required: true,
                            message: intl.formatMessage({ id: 'pages.document.approval.modal.delegateUserRequired' }),
                        },
                    ]}
                >
                    <Select placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.delegateUserPlaceholder' })}>
                        {users.map((user) => (
                            <Select.Option key={user.id} value={user.id}>
                                {user.username}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="comment" label={intl.formatMessage({ id: 'pages.document.approval.modal.delegateComment' })}>
                    <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.delegateCommentPlaceholder' })} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default DelegateModal;
