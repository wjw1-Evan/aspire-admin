import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer, ProDescriptions, ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { Space, Tag, Button, Input, Modal, App, Select } from 'antd';
import { Drawer } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, EyeOutlined, HistoryOutlined, RollbackOutlined, UserSwitchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useIntl } from '@umijs/max';
import {
  getTodoInstances,
  getWorkflowInstance,
  getApprovalHistory,
  executeNodeAction,
  getNodeForm,
  submitNodeForm,
  type WorkflowInstance,
  WorkflowStatus,
  ApprovalAction,
  type FormDefinition,
  FormFieldType,
} from '@/services/workflow/api';
import { getDocumentDetail } from '@/services/document/api';
import type { Document } from '@/services/document/api';
import { getStatusMeta, workflowStatusMap, approvalActionMap } from '@/utils/statusMaps';

interface TodoItem {
  id: string;
  workflowDefinitionId: string;
  documentId: string;
  status: WorkflowStatus;
  currentNodeId: string;
  startedBy: string;
  startedAt?: string;
  timeoutAt?: string;
  definitionName: string;
  definitionCategory: string;
  currentNode: { id: string; label?: string; nodeType: string };
  document?: { id: string; title: string; status: number; documentType: string; category: string; createdAt: string; createdBy: string };
}

const ApprovalPage: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    detailVisible: false,
    viewingInstance: null as TodoItem | null,
    historyVisible: false,
    history: [] as any[],
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const getFlowStatus = (status?: WorkflowStatus | null) => getStatusMeta(intl, status, workflowStatusMap);

  const handleApprove = async (item: TodoItem) => {
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.document.approval.confirmApprove' }),
      content: intl.formatMessage({ id: 'pages.document.approval.confirmApproveContent' }),
      onOk: async () => {
        const res = await executeNodeAction(item.id, item.currentNodeId, {
          action: 'approve',
        });
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.approved' }));
          actionRef.current?.reload();
        }
      },
    });
  };

  const handleReject = async (item: TodoItem) => {
    let rejectComment = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.document.approval.confirmReject' }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.document.approval.rejectReason' })}</p>
          <Input.TextArea
            id="reject-reason-input"
            rows={3}
            onChange={(e) => { rejectComment = e.target.value; }}
            placeholder={intl.formatMessage({ id: 'pages.document.approval.rejectReasonPlaceholder' })}
          />
        </div>
      ),
      onOk: async () => {
        if (!rejectComment.trim()) {
          message.warning(intl.formatMessage({ id: 'pages.document.approval.rejectReasonRequired' }));
          return;
        }
        const res = await executeNodeAction(item.id, item.currentNodeId, {
          action: 'reject',
          comment: rejectComment,
        });
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.rejected' }));
          actionRef.current?.reload();
        }
      },
    });
  };

  const handleReturn = async (item: TodoItem) => {
    let returnComment = '';
    let targetNodeId = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.document.approval.confirmReturn' }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.document.approval.selectTargetNode' })}</p>
          <Select
            style={{ width: '100%', marginBottom: 12 }}
            placeholder={intl.formatMessage({ id: 'pages.document.approval.selectTargetNode' })}
            onChange={(value) => { targetNodeId = value; }}
            options={[]}
          />
          <p>{intl.formatMessage({ id: 'pages.document.approval.returnReason' })}</p>
          <Input.TextArea
            rows={3}
            onChange={(e) => { returnComment = e.target.value; }}
            placeholder={intl.formatMessage({ id: 'pages.document.approval.reasonPlaceholder' })}
          />
        </div>
      ),
      onOk: async () => {
        if (!targetNodeId.trim()) {
          message.warning(intl.formatMessage({ id: 'pages.document.approval.selectTargetNodeRequired' }));
          return;
        }
        const res = await executeNodeAction(item.id, item.currentNodeId, {
          action: 'return',
          targetNodeId,
          comment: returnComment,
        });
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.returned' }));
          actionRef.current?.reload();
        }
      },
    });
  };

  const handleDelegate = async (item: TodoItem) => {
    let delegateComment = '';
    let delegateToUserId = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.document.approval.confirmDelegate' }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.document.approval.delegateTo' })}</p>
          <Select
            style={{ width: '100%', marginBottom: 12 }}
            placeholder={intl.formatMessage({ id: 'pages.document.approval.selectUser' })}
            onChange={(value) => { delegateToUserId = value; }}
            options={[]}
            showSearch
            filterOption={(input, option) => ((option as any)?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <p>{intl.formatMessage({ id: 'pages.document.approval.returnReason' })}</p>
          <Input.TextArea
            rows={3}
            onChange={(e) => { delegateComment = e.target.value; }}
            placeholder={intl.formatMessage({ id: 'pages.document.approval.reasonPlaceholder' })}
          />
        </div>
      ),
      onOk: async () => {
        if (!delegateToUserId.trim()) {
          message.warning(intl.formatMessage({ id: 'pages.document.approval.selectUserRequired' }));
          return;
        }
        const res = await executeNodeAction(item.id, item.currentNodeId, {
          action: 'delegate',
          delegateToUserId,
          comment: delegateComment,
        });
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.delegated' }));
          actionRef.current?.reload();
        }
      },
    });
  };

  const columns: ProColumns<TodoItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.document.table.title' }),
      dataIndex: ['document', 'title'],
      ellipsis: true,
      sorter: true,
      render: (_, r) => <a onClick={() => set({ viewingInstance: r, detailVisible: true })}><FileTextOutlined /> {r.document?.title || '-'}</a>,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.name' }),
      dataIndex: 'definitionName',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.currentNode' }),
      dataIndex: ['currentNode', 'label'],
      render: (_, r) => r.currentNode?.label || r.currentNodeId,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.type' }),
      dataIndex: ['document', 'documentType'],
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdBy' }),
      dataIndex: 'startedBy',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdAt' }),
      dataIndex: 'startedAt',
      sorter: true,
      render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.action' }),
      valueType: 'option',
      fixed: 'right',
      width: 260,
      render: (_, r) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingInstance: r, detailVisible: true })}>
            {intl.formatMessage({ id: 'pages.document.action.view' })}
          </Button>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(r)}>
            {intl.formatMessage({ id: 'pages.document.approval.approve' })}
          </Button>
          <Button type="link" size="small" color="orange" icon={<RollbackOutlined />} onClick={() => handleReturn(r)}>
            {intl.formatMessage({ id: 'pages.document.approval.return' })}
          </Button>
          <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(r)}>
            {intl.formatMessage({ id: 'pages.document.approval.reject' })}
          </Button>
          <Button type="link" size="small" color="purple" icon={<UserSwitchOutlined />} onClick={() => handleDelegate(r)}>
            {intl.formatMessage({ id: 'pages.document.approval.delegate' })}
          </Button>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={async () => {
            try {
              const historyResponse = await getApprovalHistory(r.id);
              if (historyResponse.success && historyResponse.data) {
                set({ history: historyResponse.data, historyVisible: true });
              }
            } catch (error) { console.error('获取审批历史失败:', error); }
          }}>
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.history' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space><FileTextOutlined />{intl.formatMessage({ id: 'pages.document.approval' })}</Space>
          </Space>
        }
        request={async (params: any, sort: any, filter: any) => {
          const response = await getTodoInstances({
            page: params.current,
            pageSize: params.pageSize,
            search: state.search,
          });
          if (response.success && response.data) {
            return {
              data: (response.data as any).queryable || response.data || [],
              total: (response.data as any).rowCount || 0,
              success: true,
            };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        rowKey="id"
        search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
        ]}
      />

      <Drawer
        title={intl.formatMessage({ id: 'pages.document.approval.detail' })}
        placement="right"
        open={state.detailVisible}
        onClose={() => set({ detailVisible: false, viewingInstance: null })}
        size="large"
      >
        {state.viewingInstance && <ApprovalDetail item={state.viewingInstance} />}
      </Drawer>

      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.historyTitle' })}
        open={state.historyVisible}
        onCancel={() => set({ historyVisible: false, history: [] })}
        footer={null}
        width={800}
      >
        <div>
          {state.history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              {intl.formatMessage({ id: 'pages.workflow.monitor.history.empty' })}
            </div>
          ) : (
            state.history.map((record, index) => (
              <div key={index} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.approver' })}:</strong> {record.approverName || record.approverId}</div>
                  <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.action' })}:</strong> {(() => { const actionMeta = getStatusMeta(intl, record.action as ApprovalAction, approvalActionMap); return <Tag color={actionMeta.color}>{actionMeta.text}</Tag>; })()}</div>
                  {record.comment && <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.comment' })}:</strong> {record.comment}</div>}
                  <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.time' })}:</strong> {record.approvedAt ? dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
                </Space>
              </div>
            ))
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};

const ApprovalDetail: React.FC<{ item: TodoItem }> = ({ item }) => {
  const [doc, setDoc] = useState<Document | null>(null);
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const intl = useIntl();

  useEffect(() => {
    (async () => {
      if (item.documentId) {
        const docRes = await getDocumentDetail(item.documentId);
        if (docRes.success && docRes.data) setDoc(docRes.data as unknown as Document);
      }
      const instanceRes = await getWorkflowInstance(item.id);
      if (instanceRes.success && instanceRes.data) setInstance(instanceRes.data);
    })();
  }, [item]);

  return (
    <div>
      <ProDescriptions column={1} bordered size="small" title={intl.formatMessage({ id: 'pages.document.detail.title' })}>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.title' })}>
          <strong>{doc?.title || item.document?.title || '-'}</strong>
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.workflow.table.name' })}>{item.definitionName}</ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.workflow.monitor.table.currentNode' })}>
          <Tag color="blue">{item.currentNode?.label || item.currentNodeId}</Tag>
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.type' })}>{doc?.documentType || '-'}</ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.createdBy' })}>{item.startedBy}</ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.createdAt' })}>
          {item.startedAt ? dayjs(item.startedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </ProDescriptions.Item>
      </ProDescriptions>
      {doc?.content && (
        <div style={{ marginTop: 16 }}>
          <h4>{intl.formatMessage({ id: 'pages.document.detail.content' })}</h4>
          <div style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }} dangerouslySetInnerHTML={{ __html: doc.content }} />
        </div>
      )}
      {instance?.variables && Object.keys(instance.variables).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>{intl.formatMessage({ id: 'pages.workflow.monitor.detail.variables' })}</h4>
          <ProDescriptions column={1} bordered size="small">
            {Object.entries(instance.variables).map(([key, value]) => (
              <ProDescriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}
              </ProDescriptions.Item>
            ))}
          </ProDescriptions>
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;

