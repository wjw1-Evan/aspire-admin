import React, { useEffect, useState, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Tag,
  Progress,
  Typography,
} from 'antd';
import { KeyOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import PasswordGenerator from './PasswordGenerator';
import { checkPasswordStrength, getCategories } from '@/services/password-book/api';
import type {
  PasswordBookEntryDetail,
  CreatePasswordBookEntryRequest,
  UpdatePasswordBookEntryRequest,
  PasswordStrengthResult,
} from '../types';
import { PasswordStrengthLevel } from '../types';

const { TextArea } = Input;
const { Text } = Typography;

interface PasswordBookFormProps {
  entry?: PasswordBookEntryDetail | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PasswordBookForm: React.FC<PasswordBookFormProps> = ({
  entry,
  onSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [generatorVisible, setGeneratorVisible] = useState(false);
  const [strength, setStrength] = useState<PasswordStrengthResult | null>(null);
  const [checkingStrength, setCheckingStrength] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const isEdit = !!entry;

  // 加载分类列表
  useEffect(() => {
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
  }, []);

  // 初始化表单
  useEffect(() => {
    if (entry) {
      form.setFieldsValue({
        platform: entry.platform,
        account: entry.account,
        password: entry.password,
        url: entry.url,
        // 分类字段使用 tags 模式，需要转换为数组
        category: entry.category ? [entry.category] : [],
        tags: entry.tags,
        notes: entry.notes,
      });
      setTags(entry.tags || []);
      // 检测密码强度
      if (entry.password) {
        handleCheckStrength(entry.password);
      }
    } else {
      form.resetFields();
      setTags([]);
      setStrength(null);
    }
  }, [entry, form]);

  // 检测密码强度
  const handleCheckStrength = useCallback(async (password: string) => {
    if (!password) {
      setStrength(null);
      return;
    }

    setCheckingStrength(true);
    try {
      const response = await checkPasswordStrength(password);
      if (response.success && response.data) {
        setStrength(response.data);
      } else {
        // API 返回失败，清空强度显示
        setStrength(null);
        console.warn('密码强度检测失败:', response.errorMessage);
      }
    } catch (error) {
      // 错误由全局错误处理统一处理，但也要清空强度显示
      setStrength(null);
      console.error('密码强度检测异常:', error);
    } finally {
      setCheckingStrength(false);
    }
  }, []);

  // 密码输入变化时检测强度
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const password = e.target.value;
      handleCheckStrength(password);
    },
    [handleCheckStrength],
  );

  // 使用生成的密码
  const handleSelectPassword = useCallback(
    (password: string) => {
      form.setFieldsValue({ password });
      handleCheckStrength(password);
    },
    [form, handleCheckStrength],
  );

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // 处理分类字段：从 tags 模式中提取第一个值（分类是单个值）
      // 始终发送分类值（包括空字符串），后端会处理空字符串为 null（清空分类）
      const categoryValue = Array.isArray(values.category)
        ? (values.category[0] || '')
        : (values.category || '');

      if (isEdit && entry) {
        const updateData: UpdatePasswordBookEntryRequest = {
          platform: values.platform,
          account: values.account,
          password: values.password,
          url: values.url || undefined,
          category: categoryValue,
          tags: tags,
          notes: values.notes || undefined,
        };

        const { updatePasswordBookEntry } = await import('@/services/password-book/api');
        const response = await updatePasswordBookEntry(entry.id, updateData);

        if (!response.success) {
          throw new Error(response.errorMessage || '更新失败');
        }

        message.success('更新成功');
      } else {
        const createData: CreatePasswordBookEntryRequest = {
          platform: values.platform,
          account: values.account,
          password: values.password,
          url: values.url || undefined,
          category: categoryValue,
          tags: tags,
          notes: values.notes || undefined,
        };

        const { createPasswordBookEntry } = await import('@/services/password-book/api');
        const response = await createPasswordBookEntry(createData);

        if (!response.success) {
          throw new Error(response.errorMessage || '创建失败');
        }

        message.success('创建成功');
      }

      onSuccess();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取强度颜色
  const getStrengthColor = (level?: PasswordStrengthLevel | string) => {
    // 处理字符串值（后端可能返回字符串）
    const normalizedLevel = typeof level === 'string' 
      ? (level as PasswordStrengthLevel)
      : level;
    
    switch (normalizedLevel) {
      case PasswordStrengthLevel.VeryStrong:
      case 'veryStrong':
        return '#52c41a';
      case PasswordStrengthLevel.Strong:
      case 'strong':
        return '#1890ff';
      case PasswordStrengthLevel.Medium:
      case 'medium':
        return '#faad14';
      case PasswordStrengthLevel.Weak:
      case 'weak':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  // 获取强度文本
  const getStrengthText = (level?: PasswordStrengthLevel | string) => {
    // 处理字符串值（后端可能返回字符串）
    const normalizedLevel = typeof level === 'string' 
      ? (level as PasswordStrengthLevel)
      : level;
    
    switch (normalizedLevel) {
      case PasswordStrengthLevel.VeryStrong:
      case 'veryStrong':
        return '非常强';
      case PasswordStrengthLevel.Strong:
      case 'strong':
        return '强';
      case PasswordStrengthLevel.Medium:
      case 'medium':
        return '中等';
      case PasswordStrengthLevel.Weak:
      case 'weak':
        return '弱';
      default:
        return '未检测';
    }
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="platform"
          label="平台名称"
          rules={[{ required: true, message: '请输入平台名称' }]}
        >
          <Input placeholder="例如：GitHub、Gmail" />
        </Form.Item>

        <Form.Item
          name="account"
          label="账号"
          rules={[{ required: true, message: '请输入账号' }]}
        >
          <Input placeholder="请输入账号" />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input
            type={passwordVisible ? 'text' : 'password'}
            placeholder="请输入密码"
            onChange={handlePasswordChange}
            suffix={
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={passwordVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  style={{ border: 'none', padding: 0 }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<KeyOutlined />}
                  onClick={() => setGeneratorVisible(true)}
                  style={{ border: 'none', padding: 0 }}
                >
                  生成
                </Button>
              </Space>
            }
          />
        </Form.Item>

        {/* 密码强度指示器 */}
        {strength && (
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space>
                <Text type="secondary">密码强度：</Text>
                <Text strong style={{ color: getStrengthColor(strength.level) }}>
                  {getStrengthText(strength.level)}
                </Text>
                <Text type="secondary">({strength.score}/100)</Text>
              </Space>
              <Progress
                percent={strength.score}
                strokeColor={getStrengthColor(strength.level)}
                showInfo={false}
              />
              {strength.suggestions.length > 0 && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    建议：
                  </Text>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
                    {strength.suggestions.map((suggestion, index) => (
                      <li key={index} style={{ color: '#8c8c8c' }}>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Space>
          </div>
        )}

        <Form.Item name="url" label="网址">
          <Input placeholder="https://example.com" />
        </Form.Item>

        <Form.Item name="category" label="分类">
          <Select
            mode="tags"
            placeholder="选择或输入分类（仅保留第一个）"
            showSearch
            allowClear
            maxTagCount={1}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={categories.map((cat) => ({ label: cat, value: cat }))}
            onChange={(value) => {
              // 只保留第一个值
              if (Array.isArray(value) && value.length > 1) {
                form.setFieldsValue({ category: [value[0]] });
              }
            }}
          />
        </Form.Item>

        <Form.Item label="标签">
          <Select
            mode="tags"
            placeholder="输入标签后按回车"
            value={tags}
            onChange={setTags}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item name="notes" label="备注">
          <TextArea rows={4} placeholder="备注信息" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={onCancel}>取消</Button>
          </Space>
        </Form.Item>
      </Form>

      <PasswordGenerator
        visible={generatorVisible}
        onClose={() => setGeneratorVisible(false)}
        onSelect={handleSelectPassword}
      />
    </>
  );
};

export default PasswordBookForm;
