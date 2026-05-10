import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Modal, Select, Button, Space, Tag, Progress, List, Typography, Input, App } from 'antd';
import { useIntl } from '@umijs/max';
import {
  createBulkOperation,
  executeBulkOperation,
  cancelBulkOperation,
  getBulkOperation,
  type BulkOperation,
  type BulkOperationType,
} from '@/services/workflow/api';

const { Text } = Typography;

interface WorkflowSummary {
  id: string;
  name: string;
  category?: string;
}

interface BulkOperationsPanelProps {
  visible: boolean;
  onClose: () => void;
  selectedWorkflowIds: string[];
  selectedWorkflows: WorkflowSummary[];
  onSuccess: () => void;
}

const OPERATION_TYPES: { value: BulkOperationType; label: string }[] = [
  { value: 'Activate', label: '批量激活' },
  { value: 'Deactivate', label: '批量停用' },
  { value: 'Delete', label: '批量删除' },
  { value: 'UpdateCategory', label: '批量更新分类' },
];

const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  visible,
  onClose,
  selectedWorkflowIds,
  selectedWorkflows,
  onSuccess,
}) => {
  const intl = useIntl();
  const { message } = App.useApp();
  const [operationType, setOperationType] = useState<BulkOperationType>('Activate');
  const [categoryName, setCategoryName] = useState('');
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const startPolling = useCallback((operationId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(async () => {
      try {
        const response = await getBulkOperation(operationId);
        if (response.success && response.data) {
          setCurrentOperation(response.data);
          if (response.data.status === 'Completed' || response.data.status === 'Failed' || response.data.status === 'Cancelled') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            if (response.data.status === 'Completed') {
              message.success('批量操作已完成');
              onSuccess();
            }
          }
        }
      } catch {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 2000);
  }, [message, onSuccess]);

  const handleExecute = useCallback(async () => {
    if (selectedWorkflowIds.length === 0) return;

    if (operationType === 'UpdateCategory' && !categoryName.trim()) {
      message.warning('请输入分类名称');
      return;
    }

    setLoading(true);
    try {
      const parameters = operationType === 'UpdateCategory' ? { category: categoryName.trim() } : {};
      const response = await createBulkOperation({
        operationType,
        workflowIds: selectedWorkflowIds,
        parameters,
      });

      if (response.success && response.data) {
        setCurrentOperation(response.data);
        await executeBulkOperation(response.data.id);
        startPolling(response.data.id);
      }
    } catch (error) {
      console.error('批量操作失败:', error);
      message.error('批量操作执行失败');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflowIds, operationType, categoryName, message, startPolling]);

  const handleCancel = useCallback(async () => {
    if (!currentOperation?.id) return;
    try {
      await cancelBulkOperation(currentOperation.id);
      message.success('批量操作已取消');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setCurrentOperation(null);
    } catch {
      message.error('取消失败');
    }
  }, [currentOperation, message]);

  const handleClose = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setCurrentOperation(null);
    setCategoryName('');
    setOperationType('Activate');
    onClose();
  }, [onClose]);

  const isExecuting = currentOperation?.status === 'InProgress' || currentOperation?.status === 'Pending';
  const isDone = currentOperation?.status === 'Completed' || currentOperation?.status === 'Failed' || currentOperation?.status === 'Cancelled';
  const progressPercent = currentOperation && currentOperation.totalCount > 0
    ? Math.round((currentOperation.processedCount / currentOperation.totalCount) * 100)
    : 0;

  return (
    <Modal
      title="批量操作"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <div data-testid="bulk-operations-panel">
        {!currentOperation ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>已选中 <Tag color="blue">{selectedWorkflowIds.length}</Tag> 个工作流</Text>
            </div>

            {selectedWorkflows.length > 0 && (
              <List
                size="small"
                style={{ marginBottom: 16, maxHeight: 160, overflowY: 'auto' }}
                dataSource={selectedWorkflows}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <Text>{item.name}</Text>
                    {item.category && <Tag>{item.category}</Tag>}
                  </List.Item>
                )}
              />
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>操作类型</div>
              <Select
                style={{ width: '100%' }}
                value={operationType}
                onChange={(value) => setOperationType(value as BulkOperationType)}
                options={OPERATION_TYPES.map((ot) => ({
                  label: ot.label,
                  value: ot.value,
                }))}
              />
            </div>

            {operationType === 'UpdateCategory' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>分类名称</div>
                <Input
                  placeholder="请输入分类名称"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
            )}

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleClose}>取消</Button>
              <Button
                type="primary"
                onClick={handleExecute}
                loading={loading}
                disabled={selectedWorkflowIds.length === 0}
              >
                执行操作
              </Button>
            </Space>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Text strong style={{ fontSize: 16 }}>
                {isDone ? '操作完成' : '正在执行批量操作...'}
              </Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>进度</Text>
                <Text>{currentOperation.processedCount} / {currentOperation.totalCount}</Text>
              </div>
              <Progress percent={progressPercent} status={isDone ? 'success' : 'active'} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Space>
                <Text>成功:</Text>
                <Tag color="success">{currentOperation.successCount}</Tag>
                <Text>失败:</Text>
                <Tag color="error">{currentOperation.failureCount}</Tag>
                <Text>状态:</Text>
                <Tag>{currentOperation.status}</Tag>
              </Space>
            </div>

            {currentOperation.errors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text type="danger" strong>错误信息</Text>
                <List
                  size="small"
                  dataSource={currentOperation.errors}
                  renderItem={(error) => (
                    <List.Item>
                      <Text type="danger">
                        {error.workflowName || error.workflowId}: {error.message}
                      </Text>
                    </List.Item>
                  )}
                />
              </div>
            )}

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              {isExecuting && currentOperation.cancellable && (
                <Button onClick={handleCancel}>取消操作</Button>
              )}
              {isDone && <Button type="primary" onClick={handleClose}>关闭</Button>}
            </Space>
          </>
        )}
      </div>
    </Modal>
  );
};

export default BulkOperationsPanel;
