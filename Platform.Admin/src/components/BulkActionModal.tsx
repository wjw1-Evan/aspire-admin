import React from 'react';
import { Modal, Input, Typography, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useModalState } from '../hooks/useModalState';

const { TextArea } = Input;
const { Text } = Typography;

export interface BulkActionModalProps {
  /** 是否显示弹窗 */
  open?: boolean;
  /** 确认取消回调 */
  onCancel?: () => void;
  /** 确认操作回调 */
  onConfirm?: (reason?: string) => Promise<void> | void;
  /** 操作类型 */
  actionType?: 'delete' | 'activate' | 'deactivate' | 'custom';
  /** 自定义操作名称 */
  actionName?: string;
  /** 选中的项目数量 */
  selectedCount?: number;
  /** 操作提示信息 */
  description?: string;
  /** 是否需要输入原因 */
  requireReason?: boolean;
  /** 原因输入框占位符 */
  reasonPlaceholder?: string;
}

/**
 * 批量操作确认对话框组件
 *
 * @example
 * ```tsx
 * <BulkActionModal
 *   open={visible}
 *   actionType="delete"
 *   selectedCount={selectedRows.length}
 *   requireReason
 *   onConfirm={async (reason) => {
 *     await bulkDeleteUsers(selectedIds, reason);
 *   }}
 *   onCancel={() => setVisible(false)}
 * />
 * ```
 */
const BulkActionModal: React.FC<BulkActionModalProps> = ({
  open = false,
  onCancel,
  onConfirm,
  actionType = 'custom',
  actionName,
  selectedCount = 0,
  description,
  requireReason = false,
  reasonPlaceholder,
}) => {
  const intl = useIntl();

  // 使用自定义 Hook 管理状态
  const modalState = useModalState({
    visible: open,
    requireReason,
    onConfirm,
    onCancel,
  });

  const ACTION_CONFIG = {
    delete: {
      title: intl.formatMessage({ id: 'pages.bulkAction.batchDelete' }),
      okText: intl.formatMessage({ id: 'pages.bulkAction.okDelete' }),
      danger: true,
      description: intl.formatMessage({ id: 'pages.bulkAction.description.delete' }),
    },
    activate: {
      title: intl.formatMessage({ id: 'pages.bulkAction.batchActivate' }),
      okText: intl.formatMessage({ id: 'pages.bulkAction.okActivate' }),
      danger: false,
      description: intl.formatMessage({ id: 'pages.bulkAction.description.activate' }),
    },
    deactivate: {
      title: intl.formatMessage({ id: 'pages.bulkAction.batchDeactivate' }),
      okText: intl.formatMessage({ id: 'pages.bulkAction.okDeactivate' }),
      danger: false,
      description: intl.formatMessage({ id: 'pages.bulkAction.description.deactivate' }),
    },
    custom: {
      title: intl.formatMessage({ id: 'pages.bulkAction.batchOperation' }),
      okText: intl.formatMessage({ id: 'pages.bulkAction.ok' }),
      danger: false,
      description: undefined,
    },
  };

  const config = ACTION_CONFIG[actionType];
  const title = actionName || config.title;
  const okText = config.okText;
  const isDanger = config.danger;
  const defaultDescription = config.description;
  const defaultReasonPlaceholder = reasonPlaceholder || intl.formatMessage({ id: 'pages.bulkAction.reasonPlaceholder' });

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined
            style={{ color: isDanger ? '#ff4d4f' : '#faad14', marginRight: 8 }}
          />
          {title}
        </span>
      }
      open={open}
      onOk={modalState.handleConfirm}
      onCancel={modalState.handleCancel}
      okText={okText}
      cancelText={intl.formatMessage({ id: 'pages.modal.cancel' })}
      okButtonProps={{ danger: isDanger, loading: modalState.loading }}
      cancelButtonProps={{ disabled: modalState.loading }}
    >
      <Alert
        message={intl.formatMessage({ id: 'pages.bulkAction.selectedItems' }, { count: selectedCount })}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">{description || defaultDescription}</Text>
      </div>

      {requireReason && (
        <TextArea
          placeholder={defaultReasonPlaceholder}
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

export default BulkActionModal;
