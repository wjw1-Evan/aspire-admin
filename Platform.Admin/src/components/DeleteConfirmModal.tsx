import React from 'react';
import { Modal, Input, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useModalState } from '../hooks/useModalState';

const { TextArea } = Input;
const { Text } = Typography;

export interface DeleteConfirmModalProps {
  /** 是否显示弹窗 */
  visible?: boolean;
  /** 确认取消回调 */
  onCancel?: () => void;
  /** 确认删除回调 */
  onConfirm?: (reason?: string) => Promise<void> | void;
  /** 删除项目名称 */
  itemName?: string;
  /** 删除提示信息 */
  description?: string;
  /** 是否需要输入原因 */
  requireReason?: boolean;
  /** 原因输入框占位符 */
  reasonPlaceholder?: string;
  /** 确认按钮文字 */
  okText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
}

/**
 * 删除确认对话框组件
 * 
 * @example
 * ```tsx
 * <DeleteConfirmModal
 *   visible={visible}
 *   itemName="用户张三"
 *   description="删除后将无法恢复"
 *   requireReason
 *   onConfirm={async (reason) => {
 *     await deleteUser(userId, reason);
 *   }}
 *   onCancel={() => setVisible(false)}
 * />
 * ```
 */
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible = false,
  onCancel,
  onConfirm,
  itemName,
  description,
  requireReason = false,
  reasonPlaceholder = '请输入删除原因（选填，最多200字）',
  okText = '确定删除',
  cancelText = '取消',
}) => {
  // 使用自定义 Hook 管理状态
  const modalState = useModalState({
    visible,
    requireReason,
    onConfirm,
    onCancel,
  });

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          确认删除
        </span>
      }
      open={visible}
      onOk={modalState.handleConfirm}
      onCancel={modalState.handleCancel}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ danger: true, loading: modalState.loading }}
      cancelButtonProps={{ disabled: modalState.loading }}
    >
      <div style={{ marginBottom: 16 }}>
        {itemName && (
          <Text>
            确定要删除 <Text strong>{itemName}</Text> 吗？
          </Text>
        )}
        {description && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{description}</Text>
          </div>
        )}
      </div>

      {requireReason && (
        <TextArea
          placeholder={reasonPlaceholder}
          value={modalState.reason}
          onChange={(e) => modalState.setReason(e.target.value)}
          maxLength={200}
          showCount
          rows={4}
          disabled={modalState.loading}
        />
      )}
    </Modal>
  );
};

export default DeleteConfirmModal;



















