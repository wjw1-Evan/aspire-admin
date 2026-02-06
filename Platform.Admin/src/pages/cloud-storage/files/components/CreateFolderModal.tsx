/**
 * CreateFolderModal - 创建文件夹弹窗组件
 */

import React from 'react';
import { Modal, Form, Input, Button, Space } from 'antd';
import { useIntl } from '@umijs/max';
import type { CreateFolderModalProps } from '../types';

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
    open,
    onClose,
    onSubmit,
}) => {
    const intl = useIntl();
    const [form] = Form.useForm();

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    const handleFinish = (values: { name: string; description?: string }) => {
        onSubmit(values);
        form.resetFields();
    };

    return (
        <Modal
            title={intl.formatMessage({ id: 'pages.cloud-storage.files.newFolder.title' })}
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
                    label={intl.formatMessage({ id: 'pages.cloud-storage.files.field.folderName' })}
                    rules={[
                        { required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.files.placeholder.folderName' }) },
                        { max: 100, message: intl.formatMessage({ id: 'pages.cloud-storage.files.message.folderNameLimit' }) },
                    ]}
                >
                    <Input placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.placeholder.folderName' })} />
                </Form.Item>
                <Form.Item name="description" label={intl.formatMessage({ id: 'pages.cloud-storage.files.field.description' })}>
                    <Input.TextArea
                        placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.placeholder.description' })}
                        rows={3}
                        maxLength={500}
                    />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">
                            {intl.formatMessage({ id: 'pages.button.create' })}
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

export default CreateFolderModal;
