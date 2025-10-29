import React, { useRef, useState } from 'react';
import {
  PageContainer,
  ProTable,
  ActionType,
  ProColumns,
} from '@ant-design/pro-components';
import {
  Button,
  message,
  Popconfirm,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

interface NoticeItem {
  id: string;
  title: string;
  description?: string;
  avatar?: string;
  status?: string;
  extra?: string;
  type?: string;
  read?: boolean;
  datetime: string;
}

const NoticeManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [form] = Form.useForm();

  /**
   * 加载通知数据
   */
  const loadNoticeData = async () => {
    try {
      const response = await request<API.ApiResponse<{
        data: NoticeItem[];
        total: number;
        success: boolean;
      }>>('/api/notices', {
        method: 'GET',
      });

      if (response.success && response.data) {
        return {
          data: response.data.data || [],
          total: response.data.total || 0,
          success: true,
        };
      }
      return {
        data: [],
        total: 0,
        success: false,
      };
    } catch (error) {
      message.error('加载通知失败');
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  };

  /**
   * 创建/更新通知
   */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingNotice) {
        // 更新通知
        await request(`/api/notices/${editingNotice.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success('通知更新成功');
      } else {
        // 创建通知
        await request('/api/notices', {
          method: 'POST',
          data: values,
        });
        message.success('通知创建成功');
      }

      setModalVisible(false);
      setEditingNotice(null);
      form.resetFields();
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  /**
   * 删除通知
   */
  const handleDelete = async (id: string) => {
    try {
      await request(`/api/notices/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  /**
   * 打开编辑模态框
   */
  const handleEdit = (record: NoticeItem) => {
    setEditingNotice(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      avatar: record.avatar,
      status: record.status,
      extra: record.extra,
      type: record.type,
    });
    setModalVisible(true);
  };

  /**
   * 取消编辑
   */
  const handleCancel = () => {
    setModalVisible(false);
    setEditingNotice(null);
    form.resetFields();
  };

  const columns: ProColumns<NoticeItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      hideInSearch: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          notification: { text: '通知', color: 'blue' },
          message: { text: '消息', color: 'green' },
          event: { text: '事件', color: 'orange' },
        };
        const typeInfo = typeMap[type || 'notification'] || typeMap.notification;
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'read',
      key: 'read',
      width: 100,
      render: (read: boolean) => (
        <Tag color={read ? 'default' : 'blue'}>
          {read ? '已读' : '未读'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'datetime',
      key: 'datetime',
      width: 180,
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: any, record: NoticeItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条通知吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<NoticeItem>
        headerTitle="通知管理"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingNotice(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新建通知
          </Button>,
        ]}
        request={loadNoticeData}
        columns={columns}
      />

      <Modal
        title={editingNotice ? '编辑通知' : '新建通知'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入通知标题" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea
              rows={4}
              placeholder="请输入通知描述"
            />
          </Form.Item>

          <Form.Item name="avatar" label="头像">
            <Input placeholder="请输入头像URL" />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态">
              <Select.Option value="default">默认</Select.Option>
              <Select.Option value="success">成功</Select.Option>
              <Select.Option value="warning">警告</Select.Option>
              <Select.Option value="error">错误</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="type" label="类型">
            <Select placeholder="请选择类型">
              <Select.Option value="notification">通知</Select.Option>
              <Select.Option value="message">消息</Select.Option>
              <Select.Option value="event">事件</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="extra" label="额外信息">
            <Input placeholder="请输入额外信息" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default NoticeManagement;

