import React from 'react';
import { Modal, Form, Input } from 'antd';
import { useIntl } from '@umijs/max';
import type { AssignUserOrganizationRequest } from '@/services/organization/api';

export interface AssignUserModalProps {
    open: boolean;
    onCancel: () => void;
    onSubmit: (values: AssignUserOrganizationRequest) => Promise<void> | void;
    organizationUnitId?: string;
}

const AssignUserModal: React.FC<AssignUserModalProps> = ({ open, onCancel, onSubmit, organizationUnitId }) => {
    const intl = useIntl();
    const [form] = Form.useForm<AssignUserOrganizationRequest>();

    React.useEffect(() => {
        if (open) {
            form.resetFields();
            form.setFieldsValue({ organizationUnitId });
        }
    }, [open, organizationUnitId]);

    return (
        <Modal
            open={open}
            title={intl.formatMessage({ id: 'pages.organization.members.add' })}
            destroyOnClose
            onCancel={onCancel}
            onOk={async () => {
                const values = await form.validateFields();
                await onSubmit(values);
            }}
        >
            <Form<AssignUserOrganizationRequest> form={form} layout="vertical">
                <Form.Item name="organizationUnitId" hidden rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item
                    name="userId"
                    label={intl.formatMessage({ id: 'pages.organization.members.userId' })}
                    rules={[{ required: true }]}
                >
                    <Input placeholder={intl.formatMessage({ id: 'pages.organization.members.userId.placeholder' })} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AssignUserModal;
