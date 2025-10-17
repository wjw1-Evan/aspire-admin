import { useState, useCallback } from 'react';

export interface UseBulkActionOptions {
  /** 操作成功后的回调 */
  onSuccess?: () => void;
  /** 操作失败后的回调 */
  onError?: (error: any) => void;
  /** 是否需要输入操作原因 */
  requireReason?: boolean;
}

export interface BulkActionState {
  /** 是否显示确认对话框 */
  visible: boolean;
  /** 操作类型 */
  actionType: 'delete' | 'activate' | 'deactivate' | 'custom';
  /** 选中的项目数量 */
  selectedCount: number;
  /** 自定义操作描述 */
  description?: string;
  /** 是否正在执行操作 */
  loading: boolean;
}

/**
 * 批量操作 Hook
 * 
 * 封装批量操作确认对话框的状态管理和逻辑
 * 
 * @example
 * ```tsx
 * const { state, showConfirm, handleConfirm, hideConfirm } = useBulkAction({
 *   requireReason: true,
 *   onSuccess: () => {
 *     message.success('批量删除成功');
 *     setSelectedRows([]);
 *     actionRef.current?.reload();
 *   },
 * });
 * 
 * // 显示确认对话框
 * showConfirm({
 *   actionType: 'delete',
 *   selectedCount: selectedRows.length,
 * });
 * 
 * // 在对话框中调用
 * <BulkActionModal
 *   visible={state.visible}
 *   actionType={state.actionType}
 *   selectedCount={state.selectedCount}
 *   requireReason
 *   onConfirm={async (reason) => {
 *     await handleConfirm(
 *       async () => await bulkDelete(selectedIds, reason)
 *     );
 *   }}
 *   onCancel={hideConfirm}
 * />
 * ```
 */
export function useBulkAction(options: UseBulkActionOptions = {}) {
  const { onSuccess, onError, requireReason = false } = options;

  const [state, setState] = useState<BulkActionState>({
    visible: false,
    actionType: 'custom',
    selectedCount: 0,
    description: undefined,
    loading: false,
  });

  /**
   * 显示批量操作确认对话框
   */
  const showConfirm = useCallback(
    (params: {
      actionType: 'delete' | 'activate' | 'deactivate' | 'custom';
      selectedCount: number;
      description?: string;
    }) => {
      setState({
        visible: true,
        actionType: params.actionType,
        selectedCount: params.selectedCount,
        description: params.description,
        loading: false,
      });
    },
    [],
  );

  /**
   * 隐藏批量操作确认对话框
   */
  const hideConfirm = useCallback(() => {
    setState({
      visible: false,
      actionType: 'custom',
      selectedCount: 0,
      description: undefined,
      loading: false,
    });
  }, []);

  /**
   * 执行批量操作
   */
  const handleConfirm = useCallback(
    async (actionFunc: () => Promise<void>) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await actionFunc();
        hideConfirm();
        onSuccess?.();
      } catch (error) {
        console.error('批量操作失败:', error);
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










