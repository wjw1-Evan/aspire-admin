import React, { useState } from 'react';
import { Button, Modal, Form, Input, Switch, Space, Select, Card } from 'antd';
import { PartitionOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { PageContainer } from '@/components';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import type { PageParams } from '@/types';
import {
    getFormList,
    createForm,
    updateForm,
    deleteForm,
    FormDefinition,
} from '@/services/form/api';

const FormDefinitionManagement: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<FormDefinition | null>(null);
    const [form] = Form.useForm<FormDefinition>();
    const message = useMessage();

    const columns: ProColumns<FormDefinition>[] = [
        { title: '名称', dataIndex: 'name', ellipsis: true, sorter: true, copyable: true },
        { title: '键', dataIndex: 'key', ellipsis: true, sorter: true, copyable: true },
        { title: '版本', dataIndex: 'version', valueType: 'digit', width: 80, sorter: true },
        { title: '启用', dataIndex: 'isActive', valueType: 'switch', width: 80, sorter: true },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 150,
            valueType: 'option',
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                        setEditing(record);
                        setOpen(true);
                        form.setFieldsValue(record);
                    }}>编辑</Button>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={async () => {
                        const res = await deleteForm(record.id!);
                        if (res.success) {
                            message.success('已删除');
                        } else {
                            message.error('删除失败');
                        }
                    }}>删除</Button>
                </Space>
            ),
        },
    ];

    return (
        <PageContainer title={<Space><PartitionOutlined />表单定义</Space>}
            extra={
                <Space wrap>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setOpen(true); form.resetFields(); }}>新建表单</Button>
                </Space>
            }
        >
            <ProTable
                headerTitle="表单列表"
                rowKey="id"
                search={{ labelWidth: 'auto' }}
                request={async (params: any) => {
                    const { current, pageSize, ...rest } = params;
                    const response = await getFormList({ page: current, pageSize, ...rest } as PageParams);
                    if (response.success && response.data) {
                        return { data: response.data.queryable || [], total: response.data.rowCount || 0, success: true };
                    }
                    return { data: [], total: 0, success: false };
                }}
                columns={columns}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                width={1200}
                open={open}
                destroyOnHidden
                title={editing ? '编辑表单' : '新建表单'}
                onCancel={() => setOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setOpen(false)}>取消</Button>,
                    <Button key="ok" type="primary" onClick={async () => {
                        const values = await form.validateFields();
                        const payload: Partial<FormDefinition> = {
                            ...values,
                            key: values.key || `form_${Date.now()}`,
                            version: values.version || 1,
                            isActive: values.isActive ?? true,
                        };
                        let res;
                        if (editing?.id) {
                            res = await updateForm(editing.id, payload);
                        } else {
                            res = await createForm(payload);
                        }
                        if (res.success) {
                            message.success('已保存');
                            setOpen(false);
                        } else {
                            message.error('保存失败');
                        }
                    }}>保存</Button>
                ]}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                        <Input placeholder="请输入表单名称" />
                    </Form.Item>
                    <Form.Item name="key" label="键" rules={[{ required: true, message: '请输入键' }]}>
                        <Input placeholder="请输入表单键" />
                    </Form.Item>
                    <Form.Item name="version" label="版本" rules={[{ required: true, message: '请输入版本' }]}>
                        <Input type="number" placeholder="请输入版本号" />
                    </Form.Item>
                    <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default FormDefinitionManagement;
