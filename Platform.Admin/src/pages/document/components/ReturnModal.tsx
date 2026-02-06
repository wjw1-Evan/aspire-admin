/**
 * ReturnModal - 退回弹窗
 */

import React from 'react';
import { Modal, Form, Input, Select } from 'antd';
import { useIntl } from '@umijs/max';
import type { ReturnModalProps } from './types';

const { TextArea } = Input;

const ReturnModal: React.FC<ReturnModalProps> = ({
    open,
    onCancel,
    loading,
    returnableNodes,
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
            title={intl.formatMessage({ id: 'pages.document.approval.modal.returnTitle' })}
            open={open}
            onOk={handleOk}
            confirmLoading={loading}
            onCancel={handleCancel}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="targetNodeId"
                    label={intl.formatMessage({ id: 'pages.document.approval.modal.returnNode' })}
                    rules={[
                        {
                            required: true,
                            message: intl.formatMessage({ id: 'pages.document.approval.modal.returnNodeRequired' }),
                        },
                    ]}
                >
                    <Select
                        placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.returnNodePlaceholder' })}
                        options={returnableNodes.map(node => ({
                            label: `${node.label} (${node.type === 'start' ? '开始节点' : '审批节点'})`,
                            value: node.id
                        }))}
                        notFoundContent={returnableNodes.length === 0 ? '暂无可退回的节点' : '未找到匹配项'}
                    />
                </Form.Item>
                <Form.Item
                    name="comment"
                    label={intl.formatMessage({ id: 'pages.document.approval.modal.returnReason' })}
                    rules={[
                        {
                            required: true,
                            message: intl.formatMessage({ id: 'pages.document.approval.modal.returnReasonRequired' }),
                        },
                    ]}
                >
                    <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.returnReasonPlaceholder' })} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ReturnModal;
