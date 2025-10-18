import { useState, useEffect, useCallback } from 'react';

export interface UseModalStateOptions {
  /** 是否显示弹窗 */
  visible?: boolean;
  /** 是否需要输入原因 */
  requireReason?: boolean;
  /** 原因输入框占位符 */
  reasonPlaceholder?: string;
  /** 确认操作回调 */
  onConfirm?: (reason?: string) => Promise<void> | void;
  /** 取消回调 */
  onCancel?: () => void;
}

export interface UseModalStateResult {
  /** 原因输入值 */
  reason: string;
  /** 设置原因 */
  setReason: (reason: string) => void;
  /** 加载状态 */
  loading: boolean;
  /** 处理确认操作 */
  handleConfirm: () => Promise<void>;
  /** 处理取消操作 */
  handleCancel: () => void;
  /** 重置状态 */
  reset: () => void;
}

/**
 * Modal 状态管理 Hook
 *
 * 统一管理 Modal 的 reason 输入、loading 状态和操作处理
 *
 * @example
 * ```tsx
 * const modalState = useModalState({
 *   visible,
 *   requireReason: true,
 *   onConfirm: async (reason) => {
 *     await handleBulkDelete(selectedIds, reason);
 *   },
 *   onCancel: () => setVisible(false)
 * });
 *
 * return (
 *   <Modal
 *     open={visible}
 *     onOk={modalState.handleConfirm}
 *     onCancel={modalState.handleCancel}
 *     confirmLoading={modalState.loading}
 *   >
 *     {modalState.requireReason && (
 *       <TextArea
 *         value={modalState.reason}
 *         onChange={(e) => modalState.setReason(e.target.value)}
 *         placeholder="请输入原因"
 *       />
 *     )}
 *   </Modal>
 * );
 * ```
 */
export function useModalState(
  options: UseModalStateOptions = {},
): UseModalStateResult {
  const { visible = false, onConfirm, onCancel } = options;

  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 当弹窗关闭时重置状态
  useEffect(() => {
    if (!visible) {
      setReason('');
      setLoading(false);
    }
  }, [visible]);

  // 处理确认操作
  const handleConfirm = useCallback(async () => {
    if (!onConfirm) return;

    setLoading(true);
    try {
      await onConfirm(reason || undefined);
    } catch (error) {
      console.error('Modal 操作失败:', error);
      // 错误处理可以在这里统一处理，或者由父组件处理
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onConfirm, reason]);

  // 处理取消操作
  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // 重置状态
  const reset = useCallback(() => {
    setReason('');
    setLoading(false);
  }, []);

  return {
    reason,
    setReason,
    loading,
    handleConfirm,
    handleCancel,
    reset,
  };
}
