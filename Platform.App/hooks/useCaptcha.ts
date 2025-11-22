/**
 * 验证码管理 Hook
 * 用于管理验证码的显示和刷新
 */

import { useState, useRef, useCallback } from 'react';
import type { ImageCaptchaRef } from '@/components/ImageCaptcha';

interface UseCaptchaReturn {
  /** 是否显示验证码 */
  showCaptcha: boolean;
  /** 验证码 ID */
  captchaId: string;
  /** 验证码答案 */
  captchaAnswer: string;
  /** 验证码 key（用于强制重新渲染） */
  captchaKey: number;
  /** 验证码 ref */
  captchaRef: React.RefObject<ImageCaptchaRef>;
  /** 设置验证码 ID */
  setCaptchaId: (id: string) => void;
  /** 设置验证码答案 */
  setCaptchaAnswer: (answer: string) => void;
  /** 启用验证码 */
  enableCaptcha: () => void;
  /** 禁用验证码 */
  disableCaptcha: () => void;
  /** 刷新验证码 */
  refreshCaptcha: () => Promise<void>;
}

/**
 * 验证码管理 Hook
 */
export function useCaptcha(): UseCaptchaReturn {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const captchaRef = useRef<ImageCaptchaRef>(null);

  // 启用验证码
  const enableCaptcha = useCallback(() => {
    setShowCaptcha(true);
    setCaptchaKey(prev => prev + 1);
    setCaptchaAnswer('');
    setCaptchaId('');
  }, []);

  // 禁用验证码
  const disableCaptcha = useCallback(() => {
    setShowCaptcha(false);
    setCaptchaAnswer('');
    setCaptchaId('');
  }, []);

  // 刷新验证码
  const refreshCaptcha = useCallback(async () => {
    if (captchaRef.current) {
      await captchaRef.current.refresh();
    }
  }, []);

  return {
    showCaptcha,
    captchaId,
    captchaAnswer,
    captchaKey,
    captchaRef,
    setCaptchaId,
    setCaptchaAnswer,
    enableCaptcha,
    disableCaptcha,
    refreshCaptcha,
  };
}

