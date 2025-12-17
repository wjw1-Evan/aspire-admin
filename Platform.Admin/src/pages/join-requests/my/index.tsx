import { PageContainer } from '@/components'; import DataTable from '@/components/DataTable';
import { Tag, Button, App, Popconfirm, Space } from 'antd';
import React, { useRef, useState, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { getMyRequests, cancelRequest } from '@/services/company';
import type { ActionType, ProColumns } from '@/types/pro-components';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';

/**
 * v3.1: 我的加入申请列表
 */
const MyJoinRequests: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // 撤回申请
  const handleCancel = async (id: string) => {
    setLoading(true);
    try {
      const response = await cancelRequest(id);

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.message.applicationCancelled' }));
        actionRef.current?.reload();
      } else {
        // 失败时抛出错误，由全局错误处理统一处理
        throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.message.cancelFailed' }));
      }
      // 错误由全局错误处理统一处理，这里不需要 catch
    } finally {
      setLoading(false);
    }
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
      title: intl.formatMessage({ id: 'pages.table.companyName' }),
      dataIndex: 'companyName',
      render: (_, record) => <strong>{record.companyName}</strong>,
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
      valueEnum: {
        pending: {
          text: intl.formatMessage({ id: 'pages.status.pending' }),
          status: 'Processing',
        },
        approved: {
          text: intl.formatMessage({ id: 'pages.status.approved' }),
          status: 'Success',
        },
        rejected: {
          text: intl.formatMessage({ id: 'pages.status.rejected' }),
          status: 'Error',
        },
        cancelled: {
          text: intl.formatMessage({ id: 'pages.status.cancelled' }),
          status: 'Default',
        },
      },
      render: (_, record) => {
        const statusConfig: Record<
          string,
          { icon: React.ReactNode; color: string }
        > = {
          pending: { icon: <ClockCircleOutlined />, color: 'processing' },
          approved: { icon: <CheckCircleOutlined />, color: 'success' },
          rejected: { icon: <CloseCircleOutlined />, color: 'error' },
          cancelled: { icon: null, color: 'default' },
        };
        const config = statusConfig[record.status] || statusConfig.pending;

        return (
          <Tag icon={config.icon} color={config.color}>
            {record.status === 'pending' && intl.formatMessage({ id: 'pages.status.pending' })}
            {record.status === 'approved' && intl.formatMessage({ id: 'pages.status.approved' })}
            {record.status === 'rejected' && intl.formatMessage({ id: 'pages.status.rejected' })}
            {record.status === 'cancelled' && intl.formatMessage({ id: 'pages.status.cancelled' })}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.reviewResult' }),
      dataIndex: 'rejectReason',
      ellipsis: true,
      search: false,
      render: (_, record) => {
        if (record.status === 'approved') {
          return (
            <span style={{ color: '#52c41a' }}>
              {intl.formatMessage({ id: 'pages.modal.approved' })}{' '}
              {record.reviewedByName && intl.formatMessage({ id: 'pages.modal.reviewerPrefix' }, { name: record.reviewedByName })}
            </span>
          );
        }
        if (record.status === 'rejected') {
          return (
            <span style={{ color: '#ff4d4f' }}>
              {intl.formatMessage({ id: 'pages.modal.rejectedPrefix' })}{record.rejectReason || intl.formatMessage({ id: 'pages.table.noReason' })}
            </span>
          );
        }
        return <span style={{ color: '#999' }}>-</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.modal.confirmCancel' })}
              onConfirm={() => handleCancel(record.id)}
              okText={intl.formatMessage({ id: 'pages.table.ok' })}
              cancelText={intl.formatMessage({ id: 'pages.table.cancel' })}
            >
              <Button type="link" danger loading={loading}>
                {intl.formatMessage({ id: 'pages.button.cancelRequest' })}
              </Button>
            </Popconfirm>
          );
        }
        return null;
      },
    },
  ];

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'pages.joinRequests.my.title' })}
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
          <Button
            key="search"
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => {
              globalThis.location.href = '/company/search';
            }}
          >
            {intl.formatMessage({ id: 'pages.button.searchCompany' })}
          </Button>
        </Space>
      }
    >
      <DataTable<API.JoinRequestDetail>
        columns={columns}
        actionRef={actionRef}
        request={async (_params, _sort) => {
          try {
            const response = await getMyRequests();

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
            console.error('获取我的加入申请失败:', error);
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
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        dateFormatter="string"
        />
    </PageContainer>
  );
};

export default MyJoinRequests;
