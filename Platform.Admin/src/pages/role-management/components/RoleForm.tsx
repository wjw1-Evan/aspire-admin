import { Modal, Form, Input, Switch, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { createRole, updateRole } from '@/services/role/api';
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
} from '@/services/role/types';

interface RoleFormProps {
  visible: boolean;
  current?: Role;
  onCancel: () => void;
  onSuccess: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({
  visible,
  current,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  /**
   * 设置表单初始值
   */
  useEffect(() => {
    if (visible && current) {
      form.setFieldsValue({
        name: current.name,
        description: current.description,
        isActive: current.isActive,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, current, form]);

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (current) {
        // 更新角色
        const updateData: UpdateRoleRequest = {
          name: values.name,
          description: values.description,
          isActive: values.isActive,
        };

        const response = await updateRole(current.id!, updateData);
        if (response.success) {
          message.success('更新成功');
          onSuccess();
        } else {
          message.error(response.errorMessage || '更新失败');
        }
      } else {
        // 创建角色
        const createData: CreateRoleRequest = {
          name: values.name,
          description: values.description,
          menuIds: [],
          isActive: values.isActive !== false,
        };

        const response = await createRole(createData);
        if (response.success) {
          message.success('创建成功');
          onSuccess();
        } else {
          message.error(response.errorMessage || '创建失败');
        }
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={current ? '编辑角色' : '新增角色'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="角色名称"
          name="name"
          rules={[{ required: true, message: '请输入角色名称' }]}
        >
          <Input placeholder="请输入角色名称" />
        </Form.Item>

        <Form.Item label="角色描述" name="description">
          <Input.TextArea placeholder="请输入角色描述" rows={4} />
        </Form.Item>

        <Form.Item
          label="是否启用"
          name="isActive"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RoleForm;
