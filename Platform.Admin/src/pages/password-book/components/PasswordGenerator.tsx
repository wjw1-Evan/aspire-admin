import React, { useState, useCallback } from 'react';
import {
  Modal,
  Slider,
  Checkbox,
  Button,
  Space,
  Input,
  Typography,
} from 'antd';
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

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const message = useMessage();
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSpecialChars, setIncludeSpecialChars] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSpecialChars) {
      message.warning('至少需要选择一种字符类型');
      return;
    }

    setLoading(true);
    try {
      const request: GeneratePasswordRequest = {
        length,
        includeUppercase,
        includeLowercase,
        includeNumbers,
        includeSpecialChars,
      };
      const response = await generatePassword(request);
      if (response.success && response.data) {
        setGeneratedPassword(response.data.password);
      } else {
        message.error('生成密码失败');
      }
    } catch (error) {
      message.error('生成密码失败');
    } finally {
      setLoading(false);
    }
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSpecialChars]);

  const handleCopy = useCallback(() => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      message.success('密码已复制到剪贴板');
    }
  }, [generatedPassword]);

  const handleSelect = useCallback(() => {
    if (generatedPassword) {
      onSelect(generatedPassword);
      onClose();
    }
  }, [generatedPassword, onSelect, onClose]);

  return (
    <Modal
      title="密码生成器"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="select" type="primary" onClick={handleSelect} disabled={!generatedPassword}>
          使用此密码
        </Button>,
      ]}
      width={500}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        {/* 长度设置 */}
        <div>
          <Text strong>密码长度：{length}</Text>
          <Slider
            min={8}
            max={32}
            value={length}
            onChange={setLength}
            marks={{ 8: '8', 16: '16', 24: '24', 32: '32' }}
          />
        </div>

        {/* 字符类型选项 */}
        <div>
          <Text strong>字符类型：</Text>
          <Space orientation="vertical" style={{ marginTop: 8 }}>
            <Checkbox
              checked={includeUppercase}
              onChange={(e) => setIncludeUppercase(e.target.checked)}
            >
              大写字母 (A-Z)
            </Checkbox>
            <Checkbox
              checked={includeLowercase}
              onChange={(e) => setIncludeLowercase(e.target.checked)}
            >
              小写字母 (a-z)
            </Checkbox>
            <Checkbox
              checked={includeNumbers}
              onChange={(e) => setIncludeNumbers(e.target.checked)}
            >
              数字 (0-9)
            </Checkbox>
            <Checkbox
              checked={includeSpecialChars}
              onChange={(e) => setIncludeSpecialChars(e.target.checked)}
            >
              特殊字符 (!@#$%^&*)
            </Checkbox>
          </Space>
        </div>

        {/* 生成按钮 */}
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleGenerate}
          loading={loading}
          block
        >
          生成密码
        </Button>

        {/* 生成的密码 */}
        {generatedPassword && (
          <div>
            <Text strong>生成的密码：</Text>
            <Input.Group compact style={{ marginTop: 8 }}>
              <Input
                value={generatedPassword}
                readOnly
                style={{ width: 'calc(100% - 80px)' }}
              />
              <Button icon={<CopyOutlined />} onClick={handleCopy}>
                复制
              </Button>
            </Input.Group>
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default PasswordGenerator;
