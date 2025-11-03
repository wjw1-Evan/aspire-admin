import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import React, { useRef, useState, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { getCurrentUserActivityLogs } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import LogDetailDrawer from '../user-log/components/LogDetailDrawer';

const MyActivity: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);

  const handleViewDetail = (record: UserActivityLog) => {
    setSelectedLog(record);
    setDetailDrawerOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDrawerOpen(false);
    setSelectedLog(null);
  };

  /**
   * 获取 HTTP 方法的颜色
   */
  const getMethodColor = (method?: string): string => {
    const colors: Record<string, string> = {
      GET: 'blue',
      POST: 'green',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'purple',
    };
    return colors[method || ''] || 'default';
  };

  /**
   * 获取状态码的 Badge 状态
   */
  const getStatusBadge = (statusCode?: number) => {
    if (statusCode === undefined || statusCode === null) return null;

    if (statusCode >= 200 && statusCode < 300) {
      return <Badge status="success" text={statusCode} />;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return <Badge status="warning" text={statusCode} />;
    }
    if (statusCode >= 500) {
      return <Badge status="error" text={statusCode} />;
    }
    return <Badge status="default" text={statusCode} />;
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

      headers.forEach((header) => {
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
      });
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
          headers.forEach((header) => {
            const headerEl = header as HTMLElement;
            if ((headerEl as any)._mouseMoveHandler) {
              headerEl.removeEventListener('mousemove', (headerEl as any)._mouseMoveHandler);
            }
            if ((headerEl as any)._mouseDownHandler) {
              headerEl.removeEventListener('mousedown', (headerEl as any)._mouseDownHandler);
            }
          });
        }
      }
    };
  }, []);
  
  const columns: ProColumns<UserActivityLog>[] = [
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      dataIndex: 'action',
      key: 'action',
      search: false,
       sorter: true,
      
    },
    {
      title: intl.formatMessage({ id: 'pages.table.httpMethod' }),
      dataIndex: 'httpMethod',
      key: 'httpMethod',
      search: false,
      render: (_, record) => {
        if (!record.httpMethod) return '-';
        return (
          <Tag color={getMethodColor(record.httpMethod)}>
            {record.httpMethod}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.statusCode' }),
      dataIndex: 'statusCode',
      key: 'statusCode',
      search: false,
      render: (_, record) => getStatusBadge(record.statusCode),
    },
   
    {
      title: intl.formatMessage({ id: 'pages.table.fullUrl' }),
      dataIndex: 'fullUrl',
      key: 'fullUrl',
      search: false,
      ellipsis: true,
      render: (_, record) => {
        if (!record.fullUrl) return '-';
        return <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.fullUrl}</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.ipAddress' }),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.userAgent' }),
      dataIndex: 'userAgent',
      key: 'userAgent',
      search: false,
      ellipsis: true,
      hideInTable: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actionTime' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="view"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          {intl.formatMessage({ id: 'pages.table.detail' })}
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'pages.myActivity.title' }),
        subTitle: intl.formatMessage({ id: 'pages.myActivity.subTitle' }),
      }}
    >
      <div ref={tableRef}>
        <ProTable<UserActivityLog>
          actionRef={actionRef}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={{
          labelWidth: 120,
          optionRender: (_searchConfig, _formProps, dom) => {
            const reversed = [...dom];
            reversed.reverse();
            return reversed;
          },
        }}
        request={async (params, sort) => {
          const { current = 1, pageSize = 20, action } = params;

          // 处理排序参数
          let sortBy = 'createdAt'; // 默认按创建时间排序
          let sortOrder: 'asc' | 'desc' = 'desc'; // 默认降序

          if (sort && Object.keys(sort).length > 0) {
            // ProTable 的 sort 格式: { fieldName: 'ascend' | 'descend' }
            const sortKey = Object.keys(sort)[0];
            const sortValue = sort[sortKey];
            
            // 将驼峰命名转换为后端字段名（如果需要）
            sortBy = sortKey === 'createdAt' ? 'createdAt' : sortKey;
            sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
          }

          try {
            const response = await getCurrentUserActivityLogs({
              page: current,
              pageSize,
              action,
              sortBy,
              sortOrder,
            });

            if (response.success && response.data) {
              // 后端返回的数据结构：{ data: { data: [...], total: xxx, ... } }
              const result = response.data as any;
              return {
                data: result.data || [],
                total: result.total || 0,
                success: true,
              };
            }

            return {
              data: [],
              total: 0,
              success: false,
            };
          } catch (error) {
            console.error('Failed to load activity logs:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        />
      </div>

      <LogDetailDrawer
        open={detailDrawerOpen}
        log={selectedLog}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default MyActivity;

