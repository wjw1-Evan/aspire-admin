import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer, ProDescriptions } from '@ant-design/pro-components';
import { Space, Tag, Button, Input, Modal, App } from 'antd';
import { Drawer } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
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
      title: intl.formatMessage({ id: 'pages.document.approval.confirmApprove', defaultMessage: '确认通过' }),
      content: intl.formatMessage({ id: 'pages.document.approval.confirmApproveContent', defaultMessage: '确定要通过此审批？' }),
      onOk: async () => {
        const res = await executeNodeAction(item.id, item.currentNodeId, {
          action: 'approve',
        });
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.approved', defaultMessage: '审批通过' }));
          actionRef.current?.reload();
        }
      },
    });
  };

  const handleReject = async (item: TodoItem) => {
    let rejectComment = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.document.approval.confirmReject', defaultMessage: '拒绝审批' }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.document.approval.rejectReason', defaultMessage: '请输入拒绝原因' })}</p>
          <Input.TextArea
            id="reject-reason-input"
            rows={3}
            onChange={(e) => { rejectComment = e.target.value; }}
            placeholder={intl.formatMessage({ id: 'pages.document.approval.rejectReasonPlaceholder', defaultMessage: '请输入拒绝原因' })}
          />
        </div>
      ),
      onOk: async () => {
        if (!rejectComment.trim()) {
          message.warning(intl.formatMessage({ id: 'pages.document.approval.rejectReasonRequired', defaultMessage: '拒绝原因不能为空' }));
          return;
        }
        const res = await executeNodeAction(item.id, item.currentNodeId, {
          action: 'reject',
          comment: rejectComment,
        });
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.rejected', defaultMessage: '已拒绝' }));
          actionRef.current?.reload();
        }
      },
    });
  };

  const columns: ProColumns<TodoItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.document.table.title', defaultMessage: '公文标题' }),
      dataIndex: ['document', 'title'],
      ellipsis: true,
      sorter: true,
      render: (_, r) => <a onClick={() => set({ viewingInstance: r, detailVisible: true })}><FileTextOutlined /> {r.document?.title || '-'}</a>,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.name', defaultMessage: '流程名称' }),
      dataIndex: 'definitionName',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.currentNode', defaultMessage: '当前节点' }),
      dataIndex: ['currentNode', 'label'],
      render: (_, r) => r.currentNode?.label || r.currentNodeId,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.type', defaultMessage: '类型' }),
      dataIndex: ['document', 'documentType'],
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdBy', defaultMessage: '发起人' }),
      dataIndex: 'startedBy',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdAt', defaultMessage: '发起时间' }),
      dataIndex: 'startedAt',
      sorter: true,
      render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.action', defaultMessage: '操作' }),
      valueType: 'option',
      fixed: 'right',
      width: 260,
      render: (_, r) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingInstance: r, detailVisible: true })}>
            {intl.formatMessage({ id: 'pages.document.action.view', defaultMessage: '查看' })}
          </Button>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(r)}>
            {intl.formatMessage({ id: 'pages.document.approval.approve', defaultMessage: '通过' })}
          </Button>
          <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(r)}>
            {intl.formatMessage({ id: 'pages.document.approval.reject', defaultMessage: '拒绝' })}
          </Button>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={async () => {
            try {
              const historyResponse = await getApprovalHistory(r.id);
              if (historyResponse.success && historyResponse.data) {
                set({ history: historyResponse.data, historyVisible: true });
              }
            } catch (error) { console.error('获取审批历史失败:', error); }
          }}>
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.history', defaultMessage: '历史' })}
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
            <Space><FileTextOutlined />{intl.formatMessage({ id: 'pages.document.approval', defaultMessage: '我的审批' })}</Space>
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
            placeholder={intl.formatMessage({ id: 'pages.document.search.placeholder', defaultMessage: '搜索...' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
        ]}
      />

      <Drawer
        title={intl.formatMessage({ id: 'pages.document.approval.detail', defaultMessage: '审批详情' })}
        placement="right"
        open={state.detailVisible}
        onClose={() => set({ detailVisible: false, viewingInstance: null })}
        size="large"
      >
        {state.viewingInstance && <ApprovalDetail item={state.viewingInstance} />}
      </Drawer>

      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.historyTitle', defaultMessage: '审批历史' })}
        open={state.historyVisible}
        onCancel={() => set({ historyVisible: false, history: [] })}
        footer={null}
        width={800}
      >
        <div>
          {state.history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              {intl.formatMessage({ id: 'pages.workflow.monitor.history.empty', defaultMessage: '暂无审批记录' })}
            </div>
          ) : (
            state.history.map((record, index) => (
              <div key={index} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.approver', defaultMessage: '审批人' })}:</strong> {record.approverName || record.approverId}</div>
                  <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.action', defaultMessage: '操作' })}:</strong> {(() => { const actionMeta = getStatusMeta(intl, record.action as ApprovalAction, approvalActionMap); return <Tag color={actionMeta.color}>{actionMeta.text}</Tag>; })()}</div>
                  {record.comment && <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.comment', defaultMessage: '意见' })}:</strong> {record.comment}</div>}
                  <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.time', defaultMessage: '时间' })}:</strong> {record.approvedAt ? dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
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
      <ProDescriptions column={1} bordered size="small" title={intl.formatMessage({ id: 'pages.document.detail.title', defaultMessage: '公文信息' })}>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.title', defaultMessage: '标题' })}>
          <strong>{doc?.title || item.document?.title || '-'}</strong>
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.workflow.table.name', defaultMessage: '流程' })}>{item.definitionName}</ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.workflow.monitor.table.currentNode', defaultMessage: '当前节点' })}>
          <Tag color="blue">{item.currentNode?.label || item.currentNodeId}</Tag>
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.type', defaultMessage: '类型' })}>{doc?.documentType || '-'}</ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.createdBy', defaultMessage: '发起人' })}>{item.startedBy}</ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.table.createdAt', defaultMessage: '发起时间' })}>
          {item.startedAt ? dayjs(item.startedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </ProDescriptions.Item>
      </ProDescriptions>
      {doc?.content && (
        <div style={{ marginTop: 16 }}>
          <h4>{intl.formatMessage({ id: 'pages.document.detail.content', defaultMessage: '公文内容' })}</h4>
          <div style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }} dangerouslySetInnerHTML={{ __html: doc.content }} />
        </div>
      )}
      {instance?.variables && Object.keys(instance.variables).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>{intl.formatMessage({ id: 'pages.workflow.monitor.detail.variables', defaultMessage: '流程变量' })}</h4>
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
