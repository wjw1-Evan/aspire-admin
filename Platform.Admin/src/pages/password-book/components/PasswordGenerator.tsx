import React, { useState, useCallback } from 'react';
import { Modal, Slider, Checkbox, Button, Space, Input, Typography } from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { generatePassword } from '@/services/password-book/api';
import type { GeneratePasswordRequest } from '../types';

const { Text } = Typography;

interface PasswordGeneratorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (password: string) => void;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ open, onClose, onSelect }) => {
  const message = useMessage();
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSpecialChars: true });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!Object.values(options).some(Boolean)) {
      message.warning('至少需要选择一种字符类型');
      return;
    }
    setLoading(true);
    try {
      const response = await generatePassword({ length, ...options } as GeneratePasswordRequest);
      if (response.success && response.data) setGeneratedPassword(response.data.password);
      else message.error('生成密码失败');
    } catch {
      message.error('生成密码失败');
    } finally {
      setLoading(false);
    }
  }, [length, options]);

  const handleCopy = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      message.success('密码已复制到剪贴板');
    }
  };

  const handleSelect = () => {
    if (generatedPassword) {
      onSelect(generatedPassword);
      onClose();
    }
  };

  const updateOption = (key: string) => (e: any) => setOptions(prev => ({ ...prev, [key]: e.target.checked }));

  return (
    <Modal
      title="密码生成器"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="select" type="primary" onClick={handleSelect} disabled={!generatedPassword}>使用此密码</Button>,
      ]}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text strong>密码长度：{length}</Text>
          <Slider min={8} max={32} value={length} onChange={setLength} marks={{ 8: '8', 16: '16', 24: '24', 32: '32' }} />
        </div>

        <div>
          <Text strong>字符类型：</Text>
          <Space direction="vertical" style={{ marginTop: 8 }}>
            <Checkbox checked={options.includeUppercase} onChange={updateOption('includeUppercase')}>大写字母 (A-Z)</Checkbox>
            <Checkbox checked={options.includeLowercase} onChange={updateOption('includeLowercase')}>小写字母 (a-z)</Checkbox>
            <Checkbox checked={options.includeNumbers} onChange={updateOption('includeNumbers')}>数字 (0-9)</Checkbox>
            <Checkbox checked={options.includeSpecialChars} onChange={updateOption('includeSpecialChars')}>特殊字符 (!@#$%^&*)</Checkbox>
          </Space>
        </div>

        <Button type="primary" icon={<ReloadOutlined />} onClick={handleGenerate} loading={loading} block>生成密码</Button>

        {generatedPassword && (
          <div>
            <Text strong>生成的密码：</Text>
            <Input.Group compact style={{ marginTop: 8 }}>
              <Input value={generatedPassword} readOnly style={{ width: 'calc(100% - 80px)' }} />
              <Button icon={<CopyOutlined />} onClick={handleCopy}>复制</Button>
            </Input.Group>
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default PasswordGenerator;
