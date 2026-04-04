import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Select, Button, Space, Progress, Typography } from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { KeyOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import PasswordGenerator from './PasswordGenerator';
import { checkPasswordStrength, getCategories, createPasswordBookEntry, updatePasswordBookEntry } from '@/services/password-book/api';
import type { PasswordBookEntryDetail, CreatePasswordBookEntryRequest, UpdatePasswordBookEntryRequest, PasswordStrengthResult } from '../types';
import { PasswordStrengthLevel } from '../types';

const { TextArea } = Input;
const { Text } = Typography;

interface PasswordBookFormProps {
  entry?: PasswordBookEntryDetail | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const strengthColorMap: Record<string, string> = {
  veryStrong: '#52c41a', strong: '#1890ff', medium: '#faad14', weak: '#ff4d4f',
};

const strengthTextMap: Record<string, string> = {
  veryStrong: '非常强', strong: '强', medium: '中等', weak: '弱',
};

const PasswordBookForm: React.FC<PasswordBookFormProps> = ({ entry, onSuccess, onCancel }) => {
  const message = useMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [generatorVisible, setGeneratorVisible] = useState(false);
  const [strength, setStrength] = useState<PasswordStrengthResult | null>(null);
  const [checkingStrength, setCheckingStrength] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const isEdit = !!entry;

  useEffect(() => {
    getCategories().then(res => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    if (entry) {
      form.setFieldsValue({
        platform: entry.platform,
        account: entry.account,
        password: entry.password,
        url: entry.url,
        category: entry.category ? [entry.category] : [],
        tags: entry.tags,
        notes: entry.notes,
      });
      setTags(entry.tags || []);
      if (entry.password) handleCheckStrength(entry.password);
    } else {
      form.resetFields();
      setTags([]);
      setStrength(null);
    }
  }, [entry, form]);

  const handleCheckStrength = useCallback(async (password: string) => {
    if (!password) { setStrength(null); return; }
    setCheckingStrength(true);
    try {
      const response = await checkPasswordStrength(password);
      if (response.success && response.data) setStrength(response.data);
      else setStrength(null);
    } catch {
      setStrength(null);
    } finally {
      setCheckingStrength(false);
    }
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleCheckStrength(e.target.value);
  }, [handleCheckStrength]);

  const handleSelectPassword = useCallback((password: string) => {
    form.setFieldsValue({ password });
    handleCheckStrength(password);
  }, [form, handleCheckStrength]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const categoryValue = Array.isArray(values.category) ? (values.category[0] || '') : (values.category || '');
      const requestData = {
        platform: values.platform,
        account: values.account,
        password: values.password,
        url: values.url || undefined,
        category: categoryValue,
        tags,
        notes: values.notes || undefined,
      };

      const response = isEdit && entry
        ? await updatePasswordBookEntry(entry.id, requestData as UpdatePasswordBookEntryRequest)
        : await createPasswordBookEntry(requestData as CreatePasswordBookEntryRequest);

      if (!response.success) throw new Error(response.message || '操作失败');
      message.success(isEdit ? '更新成功' : '创建成功');
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item name="platform" label="平台名称" rules={[{ required: true, message: '请输入平台名称' }]}>
          <Input placeholder="例如：GitHub、Gmail" />
        </Form.Item>

        <Form.Item name="account" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
          <Input placeholder="请输入账号" />
        </Form.Item>

        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input
            type={passwordVisible ? 'text' : 'password'}
            placeholder="请输入密码"
            onChange={handlePasswordChange}
            suffix={
              <Space>
                <Button type="text" size="small" icon={passwordVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />} onClick={() => setPasswordVisible(!passwordVisible)} style={{ border: 'none', padding: 0 }} />
                <Button type="text" size="small" icon={<KeyOutlined />} onClick={() => setGeneratorVisible(true)} style={{ border: 'none', padding: 0 }}>生成</Button>
              </Space>
            }
          />
        </Form.Item>

        {strength && (
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space>
                <Text type="secondary">密码强度：</Text>
                <Text strong style={{ color: strengthColorMap[strength.level] || '#d9d9d9' }}>{strengthTextMap[strength.level] || '未检测'}</Text>
                <Text type="secondary">({strength.score}/100)</Text>
              </Space>
              <Progress percent={strength.score} strokeColor={strengthColorMap[strength.level] || '#d9d9d9'} showInfo={false} />
              {strength.suggestions.length > 0 && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>建议：</Text>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
                    {strength.suggestions.map((suggestion, index) => (
                      <li key={index} style={{ color: '#8c8c8c' }}>{suggestion}</li>
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
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={categories.map(cat => ({ label: cat, value: cat }))}
            onChange={(value) => {
              if (Array.isArray(value) && value.length > 1) form.setFieldsValue({ category: [value[0]] });
            }}
          />
        </Form.Item>

        <Form.Item label="标签">
          <Select mode="tags" placeholder="输入标签后按回车" value={tags} onChange={setTags} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="notes" label="备注">
          <TextArea rows={4} placeholder="备注信息" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? '更新' : '创建'}</Button>
            <Button onClick={onCancel}>取消</Button>
          </Space>
        </Form.Item>
      </Form>

      <PasswordGenerator open={generatorVisible} onClose={() => setGeneratorVisible(false)} onSelect={handleSelectPassword} />
    </>
  );
};

export default PasswordBookForm;
