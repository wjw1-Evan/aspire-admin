/**
 * RenameModal - 重命名弹窗组件
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Space } from 'antd';
import { useIntl } from '@umijs/max';
import type { RenameModalProps } from '../types';

const RenameModal: React.FC<RenameModalProps> = ({
    open,
    onClose,
    file,
    onSubmit,
}) => {
    const intl = useIntl();
    const [form] = Form.useForm();

    // 当文件变化时，设置表单值
    useEffect(() => {
        if (file && open) {
            form.setFieldsValue({ name: file.name });
        }
    }, [file, open, form]);

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    const handleFinish = (values: { name: string }) => {
        onSubmit(values);
        form.resetFields();
    };

    return (
        <Modal
            title={intl.formatMessage({ id: 'pages.cloud-storage.files.rename.title' })}
            open={open}
            onCancel={handleClose}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
            >
                <Form.Item
                    name="name"
                    label={intl.formatMessage({ id: 'pages.cloud-storage.files.field.newName' })}
                    rules={[
                        { required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.files.placeholder.newName' }) },
                        { max: 100, message: intl.formatMessage({ id: 'pages.cloud-storage.files.message.nameLimit' }) },
                    ]}
                >
                    <Input placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.placeholder.newName' })} />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">
                            {intl.formatMessage({ id: 'pages.button.confirm' })}
                        </Button>
                        <Button onClick={handleClose}>
                            {intl.formatMessage({ id: 'pages.button.cancel' })}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default RenameModal;
