/**
 * ShareModal - 文件分享弹窗组件
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Select, DatePicker } from 'antd';
import { useIntl } from '@umijs/max';
import type { ShareModalProps } from '../types';

const ShareModal: React.FC<ShareModalProps> = ({
    open,
    onClose,
    file,
    userOptions,
    userLoading,
    onSubmit,
}) => {
    const intl = useIntl();
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                shareType: 'internal',
                accessType: 'view',
                password: undefined,
                expiresAt: undefined,
                maxDownloads: undefined,
            });
        }
    }, [open, form]);

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    const handleFinish = (values: any) => {
        onSubmit(values);
    };

    return (
        <Modal
            title={intl.formatMessage({ id: 'pages.cloud-storage.files.share.title' })}
            open={open}
            onCancel={handleClose}
            footer={null}
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
            >
                <Form.Item label={intl.formatMessage({ id: 'pages.cloud-storage.files.share.object' })}>
                    <Input
                        value={file ? `${file.isFolder ? intl.formatMessage({ id: 'pages.cloud-storage.files.field.type.folder' }) : intl.formatMessage({ id: 'pages.cloud-storage.files.field.type.file' })}：${file.name}` : ''}
                        disabled
                    />
                </Form.Item>
                <Form.Item
                    name="shareType"
                    label={intl.formatMessage({ id: 'pages.cloud-storage.files.share.type' })}
                    rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.files.share.typePlaceholder' }) }]}
                >
                    <Select placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.share.typePlaceholder' })}>
                        <Select.Option value="internal">{intl.formatMessage({ id: 'pages.cloud-storage.files.share.type.internal' })}</Select.Option>
                        <Select.Option value="external">{intl.formatMessage({ id: 'pages.cloud-storage.files.share.type.external' })}</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.shareType !== next.shareType}>
                    {({ getFieldValue }) =>
                        getFieldValue('shareType') === 'internal' ? (
                            <Form.Item
                                name="allowedUserIds"
                                label={intl.formatMessage({ id: 'pages.cloud-storage.files.share.allowedUsers' })}
                                rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.files.share.allowedUsersPlaceholder' }) }]}
                            >
                                <Select
                                    mode="multiple"
                                    placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.share.allowedUsersPlaceholder' })}
                                    loading={userLoading}
                                    optionFilterProp="label"
                                    showSearch
                                >
                                    {userOptions.map((user) => (
                                        <Select.Option key={user.id} value={user.id} label={user.name || user.username}>
                                            {user.name || user.username}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                <Form.Item
                    name="accessType"
                    label={intl.formatMessage({ id: 'pages.cloud-storage.files.share.accessType' })}
                    rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.files.share.accessPlaceholder' }) }]}
                >
                    <Select placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.share.accessPlaceholder' })}>
                        <Select.Option value="view">{intl.formatMessage({ id: 'pages.cloud-storage.files.share.access.view' })}</Select.Option>
                        <Select.Option value="download">{intl.formatMessage({ id: 'pages.cloud-storage.files.share.access.download' })}</Select.Option>
                        <Select.Option value="edit">{intl.formatMessage({ id: 'pages.cloud-storage.files.share.access.edit' })}</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="password" label={intl.formatMessage({ id: 'pages.cloud-storage.files.share.password' })}>
                    <Input.Password placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.share.passwordPlaceholder' })} />
                </Form.Item>
                <Form.Item name="expiresAt" label={intl.formatMessage({ id: 'pages.cloud-storage.files.share.expiresAt' })}>
                    <DatePicker
                        showTime
                        placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.share.expiresPlaceholder' })}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item name="maxDownloads" label={intl.formatMessage({ id: 'pages.cloud-storage.files.share.maxDownloads' })}>
                    <Input
                        type="number"
                        placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.share.maxDownloadsPlaceholder' })}
                        min={1}
                    />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" disabled={!file}>
                            {intl.formatMessage({ id: 'pages.cloud-storage.files.share.title' })}
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

export default ShareModal;
