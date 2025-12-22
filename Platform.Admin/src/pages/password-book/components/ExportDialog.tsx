import React, { useState, useEffect } from 'react';
import {
  Modal,
  Radio,
  Select,
  Form,
  Button,
  Space,
  message,
  Alert,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { exportPasswordBook, getCategories } from '@/services/password-book/api';
import type { ExportPasswordBookRequest } from '../types';

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // 加载分类列表
  useEffect(() => {
    if (visible) {
      const fetchCategories = async () => {
        try {
          const response = await getCategories();
          if (response.success && response.data) {
            setCategories(response.data);
          }
        } catch (error) {
          // 错误由全局错误处理统一处理
        }
      };
      fetchCategories();
      form.resetFields();
    }
  }, [visible, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const request: ExportPasswordBookRequest = {
        format: values.format || 'json',
        category: values.category || undefined,
        tags: values.tags || undefined,
      };

      await exportPasswordBook(request);
      message.success('导出成功');
      onClose();
    } catch (error: any) {
      message.error(error.message || '导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="导出密码本"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Alert
        message="安全提示"
        description="导出的文件包含您的明文密码，请妥善保管，不要在不安全的环境中打开。"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ format: 'json' }}
      >
        <Form.Item name="format" label="导出格式">
          <Radio.Group>
            <Radio value="json">JSON</Radio>
            <Radio value="csv">CSV</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="category" label="分类筛选（可选）">
          <Select
            placeholder="选择分类"
            allowClear
            options={categories.map((cat) => ({ label: cat, value: cat }))}
          />
        </Form.Item>

        <Form.Item name="tags" label="标签筛选（可选）">
          <Select
            mode="tags"
            placeholder="输入标签"
            allowClear
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<DownloadOutlined />}
            >
              导出
            </Button>
            <Button onClick={onClose}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExportDialog;
