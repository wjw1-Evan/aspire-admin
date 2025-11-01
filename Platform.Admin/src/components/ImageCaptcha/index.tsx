import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button, Input, Space, message, Image } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { getImageCaptcha, verifyImageCaptcha } from '@/services/ant-design-pro/api';

interface ImageCaptchaProps {
  value?: string;
  onChange?: (value: string) => void;
  onCaptchaIdChange?: (captchaId: string) => void;
  type?: 'login' | 'register';
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
}

export interface ImageCaptchaRef {
  refresh: () => Promise<void>;
}

const ImageCaptcha = forwardRef<ImageCaptchaRef, ImageCaptchaProps>(({
  value,
  onChange,
  onCaptchaIdChange,
  type = 'login',
  placeholder = '请输入图形验证码',
  size = 'large',
}, ref) => {
  const [captchaId, setCaptchaId] = useState<string>('');
  const [imageData, setImageData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<any>(null);

  // 获取图形验证码
  const fetchCaptcha = async (showSuccessMessage = false) => {
    try {
      setLoading(true);
      const response = await getImageCaptcha(type);
      
      if (response.success && response.data) {
        setCaptchaId(response.data.captchaId);
        setImageData(response.data.imageData);
        onCaptchaIdChange?.(response.data.captchaId);
        
        // 清空输入框
        if (inputRef.current) {
          inputRef.current.input.value = '';
        }
        onChange?.('');
        
        // 只有在手动刷新时显示成功消息，自动刷新时不显示（避免频繁提示）
        if (showSuccessMessage) {
          message.success('验证码已刷新');
        }
      } else {
        message.error('获取验证码失败');
      }
    } catch (error) {
      console.error('获取图形验证码失败:', error);
      message.error('获取验证码失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 暴露刷新方法给父组件（自动刷新，不显示成功消息）
  useImperativeHandle(ref, () => ({
    refresh: () => fetchCaptcha(false),
  }));

  // 验证图形验证码
  const verifyCaptcha = async (answer: string) => {
    if (!captchaId || !answer) {
      return false;
    }

    try {
      setVerifying(true);
      const response = await verifyImageCaptcha({
        captchaId,
        answer,
        type,
      });

      if (response.success && response.data?.valid) {
        message.success('验证码正确');
        return true;
      } else {
        message.error('验证码错误，请重新输入');
        // 刷新验证码（自动刷新，不显示成功消息）
        await fetchCaptcha(false);
        return false;
      }
    } catch (error) {
      console.error('验证图形验证码失败:', error);
      message.error('验证失败，请稍后重试');
      return false;
    } finally {
      setVerifying(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange?.(inputValue);
  };

  // 处理回车键
  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value) {
      await verifyCaptcha(value);
    }
  };

  // 组件挂载时获取验证码
  React.useEffect(() => {
    fetchCaptcha();
  }, []);

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        size={size}
        disabled={verifying}
        style={{ flex: 1 }}
      />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {imageData ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Image
              src={`data:image/png;base64,${imageData}`}
              alt="验证码"
              width={120}
              height={40}
              style={{ cursor: 'pointer' }}
              onClick={() => fetchCaptcha(true)}
              preview={false}
            />
            <Button
              type="text"
              icon={<ReloadOutlined />}
              size="small"
              loading={loading}
              onClick={() => fetchCaptcha(true)}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: 24,
                height: 24,
                padding: 0,
              }}
              title="刷新验证码"
            />
          </div>
        ) : (
          <Button
            type="default"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => fetchCaptcha(true)}
            size={size}
            style={{ height: '100%' }}
          >
            获取验证码
          </Button>
        )}
      </div>
    </Space.Compact>
  );
});

ImageCaptcha.displayName = 'ImageCaptcha';

export default ImageCaptcha;
