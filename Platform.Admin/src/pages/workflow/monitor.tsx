import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Tag, Space, Button, Modal } from 'antd';
import { EyeOutlined, MonitorOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { DataTable } from '@/components/DataTable';
import {
  getWorkflowInstances,
  getWorkflowInstance,
  getApprovalHistory,
  type WorkflowInstance,
  WorkflowStatus,
} from '@/services/workflow/api';
import WorkflowDesigner from './components/WorkflowDesigner';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';

const WorkflowMonitor: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewInstance, setPreviewInstance] = useState<WorkflowInstance | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const handleRefresh = () => {
    actionRef.current?.reload?.();
  };

  const statusMap = {
    [WorkflowStatus.Running]: {
      color: 'processing',
      text: intl.formatMessage({ id: 'pages.workflow.monitor.status.running' }),
    },
    [WorkflowStatus.Completed]: {
      color: 'success',
      text: intl.formatMessage({ id: 'pages.workflow.monitor.status.completed' }),
    },
    [WorkflowStatus.Cancelled]: {
      color: 'default',
      text: intl.formatMessage({ id: 'pages.workflow.monitor.status.cancelled' }),
    },
    [WorkflowStatus.Rejected]: {
      color: 'error',
      text: intl.formatMessage({ id: 'pages.workflow.monitor.status.rejected' }),
    },
  };

  const columns: ProColumns<WorkflowInstance> = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.instanceId' }),
      dataIndex: 'id',
      ellipsis: true,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.status' }),
      dataIndex: 'status',
      render: (_, record) => {
        const status = statusMap[record.status];
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' }),
      dataIndex: 'startedBy',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedAt' }),
      dataIndex: 'startedAt',
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.completedAt' }),
      dataIndex: 'completedAt',
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.action' }),
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={async () => {
              try {
                const instanceResponse = await getWorkflowInstance(record.id!);
                if (instanceResponse.success && instanceResponse.data) {
                  setPreviewInstance(instanceResponse.data);
                  setPreviewVisible(true);
                }
              } catch (error) {
                console.error('获取实例详情失败:', error);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewProgress' })}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={async () => {
              try {
                const historyResponse = await getApprovalHistory(record.id!);
                if (historyResponse.success && historyResponse.data) {
                  setHistory(historyResponse.data);
                  setHistoryVisible(true);
                }
              } catch (error) {
                console.error('获取审批历史失败:', error);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewHistory' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <MonitorOutlined />
          {intl.formatMessage({ id: 'pages.workflow.monitor.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        >
          {intl.formatMessage({ id: 'pages.button.refresh' })}
        </Button>
      }
    >
      <DataTable<WorkflowInstance>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const response = await getWorkflowInstances({
            current: params.current,
            pageSize: params.pageSize,
            workflowDefinitionId: params.workflowDefinitionId as string,
            status: params.status as WorkflowStatus,
          });
          if (response.success && response.data) {
            return {
              data: response.data.list,
              success: true,
              total: response.data.total,
            };
          }
          return { data: [], success: false, total: 0 };
        }}
        rowKey="id"
        search={{
          labelWidth: 'auto',
          options: {
            fullScreen: true,
          },
        }}
      />

      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.progressTitle' })}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewInstance(null);
        }}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(100vh - 120px)' }}
      >
        {previewInstance && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Space>
                <Tag color={statusMap[previewInstance.status].color}>
                  {statusMap[previewInstance.status].text}
                </Tag>
                <span>
                  {intl.formatMessage({ id: 'pages.workflow.monitor.progress.currentNode' })}:{' '}
                  {previewInstance.currentNodeId}
                </span>
                <span>
                  {intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' })}:{' '}
                  {previewInstance.startedBy}
                </span>
              </Space>
            </Card>
            {/* 这里可以展示流程图形，高亮当前节点 */}
            <div style={{ height: '500px', border: '1px solid #d9d9d9' }}>
              <WorkflowDesigner visible={true} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.historyTitle' })}
        open={historyVisible}
        onCancel={() => {
          setHistoryVisible(false);
          setHistory([]);
        }}
        footer={null}
        width={800}
      >
        <div>
          {history.map((record, index) => (
            <Card key={index} style={{ marginBottom: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.approver' })}:</strong>{' '}
                  {record.approverName || record.approverId}
                </div>
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.action' })}:</strong>{' '}
                  {record.action === 0
                    ? intl.formatMessage({ id: 'pages.workflow.monitor.history.action.approve' })
                    : record.action === 1
                    ? intl.formatMessage({ id: 'pages.workflow.monitor.history.action.reject' })
                    : record.action === 2
                    ? intl.formatMessage({ id: 'pages.workflow.monitor.history.action.return' })
                    : intl.formatMessage({ id: 'pages.workflow.monitor.history.action.delegate' })}
                </div>
                {record.comment && (
                  <div>
                    <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.comment' })}:</strong>{' '}
                    {record.comment}
                  </div>
                )}
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.time' })}:</strong>{' '}
                  {record.approvedAt
                    ? dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </div>
              </Space>
            </Card>
          ))}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default WorkflowMonitor;
