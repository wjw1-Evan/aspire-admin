import React from 'react';
import { Modal, Form, Select, Input } from 'antd';
import { useIntl } from '@umijs/max';
import type { AssignUserOrganizationRequest, AvailableUserItem } from '@/services/organization/api';
import { getAvailableUsers } from '@/services/organization/api';

export interface AssignUserModalProps {
    open: boolean;
    onCancel: () => void;
    onSubmit: (values: AssignUserOrganizationRequest) => Promise<void> | void;
    organizationUnitId?: string;
}

const AssignUserModal: React.FC<AssignUserModalProps> = ({ open, onCancel, onSubmit, organizationUnitId }) => {
    const intl = useIntl();
    const [form] = Form.useForm<AssignUserOrganizationRequest>();
    const [users, setUsers] = React.useState<AvailableUserItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [searching, setSearching] = React.useState(false);

    const fetchUsers = React.useCallback(async (query?: string) => {
        if (!organizationUnitId) return;
        setLoading(true);
        try {
            const res = await getAvailableUsers(organizationUnitId, query);
            if (res?.success && res.data) {
                setUsers(res.data);
            }
        } catch (error) {
            console.error('获取可选用户失败:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationUnitId]);

    React.useEffect(() => {
        if (open && organizationUnitId) {
            fetchUsers();
        }
    }, [open, organizationUnitId, fetchUsers]);

    const handleSearch = React.useCallback((value: string) => {
        setSearching(true);
        fetchUsers(value || undefined).finally(() => setSearching(false));
    }, [fetchUsers]);

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
            destroyOnHidden
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
                    rules={[{ required: true, message: '请选择用户' }]}
                >
                    <Select
                        showSearch
                        placeholder={intl.formatMessage({ id: 'pages.organization.members.userId.placeholder' })}
                        loading={loading || searching}
                        options={users}
                        onSearch={handleSearch}
                        filterOption={false}
                        notFoundContent={loading ? '加载中...' : '未找到用户'}
                        allowClear
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AssignUserModal;
