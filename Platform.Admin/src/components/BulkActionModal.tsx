import React from 'react';
import { Modal, Input, Typography, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

export interface BulkActionModalProps {
  /** 是否显示弹窗 */
  visible?: boolean;
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

const ACTION_CONFIG = {
  delete: {
    title: '批量删除',
    okText: '确定删除',
    danger: true,
    description: '删除后将无法恢复，请谨慎操作',
  },
  activate: {
    title: '批量启用',
    okText: '确定启用',
    danger: false,
    description: '将启用选中的所有项目',
  },
  deactivate: {
    title: '批量停用',
    okText: '确定停用',
    danger: false,
    description: '将停用选中的所有项目',
  },
  custom: {
    title: '批量操作',
    okText: '确定',
    danger: false,
    description: undefined,
  },
};

/**
 * 批量操作确认对话框组件
 * 
 * @example
 * ```tsx
 * <BulkActionModal
 *   visible={visible}
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
  visible = false,
  onCancel,
  onConfirm,
  actionType = 'custom',
  actionName,
  selectedCount = 0,
  description,
  requireReason = false,
  reasonPlaceholder = '请输入操作原因（选填，最多200字）',
}) => {
  const [reason, setReason] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const config = ACTION_CONFIG[actionType];
  const title = actionName || config.title;
  const okText = config.okText;
  const isDanger = config.danger;
  const defaultDescription = config.description;

  React.useEffect(() => {
    if (!visible) {
      setReason('');
      setLoading(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm?.(reason || undefined);
    } finally {
      setLoading(false);
    }
  };

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
      open={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      okText={okText}
      cancelText="取消"
      okButtonProps={{ danger: isDanger, loading }}
      cancelButtonProps={{ disabled: loading }}
    >
      <Alert
        message={`已选中 ${selectedCount} 项`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">{description || defaultDescription}</Text>
      </div>

      {requireReason && (
        <TextArea
          placeholder={reasonPlaceholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          showCount
          rows={4}
          disabled={loading}
        />
      )}
    </Modal>
  );
};

export default BulkActionModal;



