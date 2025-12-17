import { PageContainer } from '@/components'; import DataTable from '@/components/DataTable';
import { Button, Space, App, Modal, Input } from 'antd';
import React, { useRef, useState, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
} from '@/services/company';
import type { ActionType, ProColumns } from '@/types/pro-components';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

/**
 * v3.1: 待审核的加入申请列表（管理员）
 */
const PendingJoinRequests: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // 审核通过
  const handleApprove = async (record: API.JoinRequestDetail) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.confirmApprove' }, { username: record.username }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.modal.applyReasonPrefix' })}{record.reason || intl.formatMessage({ id: 'pages.table.noReason' })}</p>
          <p>{intl.formatMessage({ id: 'pages.modal.approveWarning' })}</p>
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.okApprove' }),
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      onOk: async () => {
        setLoading(true);
        try {
          const response = await approveRequest(record.id);

          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.message.applicationApproved' }));
            actionRef.current?.reload();
          } else {
            // 失败时抛出错误，由全局错误处理统一处理
            throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.message.operationFailed' }));
          }
        } catch (error) {
          // 错误已被全局错误处理捕获并显示
          // 重新抛出以确保 Modal.confirm 在错误时不关闭（Ant Design 默认行为）
          throw error;
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 拒绝申请
  const handleReject = (record: API.JoinRequestDetail) => {
    let rejectReason = '';

    modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.rejectApplication' }, { username: record.username }),
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>{intl.formatMessage({ id: 'pages.modal.rejectReasonLabel' })}</div>
          <TextArea
            rows={4}
            placeholder={intl.formatMessage({ id: 'pages.modal.rejectReasonPlaceholder' })}
            onChange={(e) => {
              rejectReason = e.target.value;
            }}
          />
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.confirmReject' }),
      okButtonProps: { danger: true },
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      onOk: async () => {
        if (!rejectReason.trim()) {
          message.warning(intl.formatMessage({ id: 'pages.message.pleaseEnterReason' }));
          throw new Error(intl.formatMessage({ id: 'pages.message.pleaseEnterReason' }));
        }

        setLoading(true);
        try {
          const response = await rejectRequest(record.id, {
            rejectReason: rejectReason.trim(),
          });

          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.message.applicationRejected' }));
            actionRef.current?.reload();
          } else {
            // 失败时抛出错误，由全局错误处理统一处理
            throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.message.operationFailed' }));
          }
        } catch (error) {
          // 错误已被全局错误处理捕获并显示
          // 重新抛出以确保 Modal.confirm 在错误时不关闭（Ant Design 默认行为）
          throw error;
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /**
   * 初始化列宽调整功能
   */
  useEffect(() => {
    if (!tableRef.current) return;

    const initResizeHandlers = () => {
      const table = tableRef.current;
      if (!table) return;

      const thead = table.querySelector('thead');
      if (!thead) return;

      const headers = thead.querySelectorAll('th');
      let isResizing = false;
      let currentHeader: HTMLElement | null = null;
      let startX = 0;
      let startWidth = 0;

      const handleMouseDown = (e: MouseEvent, header: HTMLElement) => {
        // 只允许在表头右边缘 5px 内拖动
        const rect = header.getBoundingClientRect();
        const edgeThreshold = 5;
        const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;

        if (!isNearRightEdge) return;

        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        currentHeader = header;
        startX = e.clientX;
        startWidth = header.offsetWidth;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing || !currentHeader) return;

        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff); // 最小宽度 50px
        currentHeader.style.width = `${newWidth}px`;
        currentHeader.style.minWidth = `${newWidth}px`;
        currentHeader.style.maxWidth = `${newWidth}px`;
      };

      const handleMouseUp = () => {
        isResizing = false;
        currentHeader = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      for (const header of headers) {
        const headerEl = header as HTMLElement;
        headerEl.style.position = 'relative';
        headerEl.style.cursor = 'default';
        
        const mouseMoveHandler = (e: MouseEvent) => {
          const rect = headerEl.getBoundingClientRect();
          const edgeThreshold = 5;
          const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;
          
          if (isNearRightEdge && !isResizing) {
            headerEl.style.cursor = 'col-resize';
          } else if (!isResizing) {
            headerEl.style.cursor = 'default';
          }
        };

        headerEl.addEventListener('mousemove', mouseMoveHandler);
        (headerEl as any)._mouseMoveHandler = mouseMoveHandler;

        const mouseDownHandler = (e: MouseEvent) => {
          handleMouseDown(e, headerEl);
        };
        headerEl.addEventListener('mousedown', mouseDownHandler);
        (headerEl as any)._mouseDownHandler = mouseDownHandler;
      }
    };

    // 延迟初始化，确保表格已渲染
    let timer: NodeJS.Timeout | null = setTimeout(() => {
      initResizeHandlers();
    }, 300);

    // 监听表格变化，重新初始化
    const observer = new MutationObserver(() => {
      // 防抖，避免频繁初始化
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        initResizeHandlers();
      }, 300);
    });

    if (tableRef.current) {
      observer.observe(tableRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      observer.disconnect();
      
      // 清理事件监听器
      if (tableRef.current) {
        const thead = tableRef.current.querySelector('thead');
        if (thead) {
          const headers = thead.querySelectorAll('th');
          for (const header of headers) {
            const headerEl = header as HTMLElement;
            if ((headerEl as any)._mouseMoveHandler) {
              headerEl.removeEventListener('mousemove', (headerEl as any)._mouseMoveHandler);
            }
            if ((headerEl as any)._mouseDownHandler) {
              headerEl.removeEventListener('mousedown', (headerEl as any)._mouseDownHandler);
            }
          }
        }
      }
    };
  }, []);

  const columns: ProColumns<API.JoinRequestDetail>[] = [
    {
      title: intl.formatMessage({ id: 'pages.table.applicant' }),
      dataIndex: 'username',
      render: (_, record) => (
        <div>
          <div>
            <strong>{record.username}</strong>
          </div>
          {record.userEmail && (
            <div style={{ fontSize: 12, color: '#999' }}>
              {record.userEmail}
            </div>
          )}
        </div>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.applyReason' }),
      dataIndex: 'reason',
      ellipsis: true,
      search: false,
      render: (text) => text || <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.table.noReason' })}</span>,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.applyTime' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'status',
      hideInTable: true,
      valueEnum: {
        pending: {
          text: intl.formatMessage({ id: 'pages.status.pending' }),
          status: 'Processing',
        },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleApprove(record)}
            loading={loading}
            icon={<CheckCircleOutlined />}
          >
            {intl.formatMessage({ id: 'pages.button.approve' })}
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleReject(record)}
            loading={loading}
            icon={<CloseCircleOutlined />}
          >
            {intl.formatMessage({ id: 'pages.button.reject' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <ClockCircleOutlined />
          {intl.formatMessage({ id: 'pages.joinRequests.pending.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              actionRef.current?.reload();
            }}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
        </Space>
      }
    >
      <DataTable<API.JoinRequestDetail>
        columns={columns}
        actionRef={actionRef}
        request={async (_params, _sort) => {
          try {
            const response = await getPendingRequests();

            if (response.success && response.data) {
              return {
                data: response.data,
                success: true,
                total: response.data.length,
              };
            }

            return {
              data: [],
              success: false,
            };
          } catch (error) {
            console.error('获取待审核申请失败:', error);
            // 注意：这是 ProTable request 函数的特殊处理模式
            // 错误已被全局错误处理捕获并显示错误提示，这里返回空数据让表格显示空状态
            // 这是为了在错误已由全局处理显示的情况下，避免表格显示错误状态
            return {
              data: [],
              success: false,
            };
          }
        }}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 10,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        dateFormatter="string"
        />
    </PageContainer>
  );
};

export default PendingJoinRequests;
