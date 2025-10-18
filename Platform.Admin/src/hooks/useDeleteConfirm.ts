import { useState, useCallback } from 'react';

export interface UseDeleteConfirmOptions {
  /** 删除成功后的回调 */
  onSuccess?: () => void;
  /** 删除失败后的回调 */
  onError?: (error: any) => void;
  /** 是否需要输入删除原因 */
  requireReason?: boolean;
}

export interface DeleteConfirmState {
  /** 是否显示确认对话框 */
  visible: boolean;
  /** 当前要删除的项目信息 */
  currentItem: {
    id?: string;
    name?: string;
    description?: string;
  } | null;
  /** 是否正在删除 */
  loading: boolean;
}

/**
 * 删除确认 Hook
 * 
 * 封装删除确认对话框的状态管理和逻辑
 * 
 * @example
 * ```tsx
 * const { state, showConfirm, handleConfirm, hideConfirm } = useDeleteConfirm({
 *   requireReason: true,
 *   onSuccess: () => {
 *     message.success('删除成功');
 *     actionRef.current?.reload();
 *   },
 * });
 * 
 * // 显示确认对话框
 * showConfirm({ id: user.id, name: user.username });
 * 
 * // 在对话框中调用
 * <DeleteConfirmModal
 *   visible={state.visible}
 *   itemName={state.currentItem?.name}
 *   description={state.currentItem?.description}
 *   requireReason
 *   onConfirm={async (reason) => {
 *     await handleConfirm(
 *       async () => await deleteUser(state.currentItem!.id!, reason)
 *     );
 *   }}
 *   onCancel={hideConfirm}
 * />
 * ```
 */
export function useDeleteConfirm(options: UseDeleteConfirmOptions = {}) {
  const { onSuccess, onError, requireReason = false } = options;

  const [state, setState] = useState<DeleteConfirmState>({
    visible: false,
    currentItem: null,
    loading: false,
  });

  /**
   * 显示删除确认对话框
   */
  const showConfirm = useCallback((item: { id?: string; name?: string; description?: string }) => {
    setState({
      visible: true,
      currentItem: item,
      loading: false,
    });
  }, []);

  /**
   * 隐藏删除确认对话框
   */
  const hideConfirm = useCallback(() => {
    setState({
      visible: false,
      currentItem: null,
      loading: false,
    });
  }, []);

  /**
   * 执行删除操作
   */
  const handleConfirm = useCallback(
    async (deleteFunc: () => Promise<void>) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await deleteFunc();
        hideConfirm();
        onSuccess?.();
      } catch (error) {
        console.error('删除失败:', error);
        onError?.(error);
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [hideConfirm, onSuccess, onError],
  );

  return {
    state,
    showConfirm,
    hideConfirm,
    handleConfirm,
    requireReason,
  };
}














