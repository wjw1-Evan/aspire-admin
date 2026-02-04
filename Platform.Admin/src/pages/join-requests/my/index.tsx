import { PageContainer } from '@/components';
import DataTable from '@/components/DataTable';
import { Tag, Button, App, Popconfirm, Space, Grid, Form, Input } from 'antd';
import SearchFormCard from '@/components/SearchFormCard';

const { useBreakpoint } = Grid;
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import { getMyJoinRequests, cancelJoinRequest } from '@/services/company';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

// 统一的日期时间格式化函数
const formatDateTime = (dateTime: string | null | undefined): string => {
  if (!dateTime) return '-';
  try {
    const date = dayjs(dateTime);
    if (!date.isValid()) return dateTime;
    return date.format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.error('日期格式化错误:', error, dateTime);
    return dateTime || '-';
  }
};

/**
 * v3.1: 我的加入申请列表
 */
const MyJoinRequests: React.FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();

  // 获取我的申请列表（使用 useCallback 避免死循环）
  const fetchMyRequests = useCallback(async (_params: any, _sort?: Record<string, any>) => {
    try {
      const { keyword } = searchForm.getFieldsValue();
      const response = await getMyJoinRequests();

      // 前端进行关键字过滤，因为新的API不支持关键字参数
      // 实际上 getMyJoinRequests 也没有参数
      let filteredData = response.data || [];
      if (keyword && response.data) {
        filteredData = response.data.filter(item =>
          item.companyName?.toLowerCase().includes(keyword.toLowerCase()) ||
          item.reason?.toLowerCase().includes(keyword.toLowerCase())
        );
      } else if (response.data) {
        filteredData = response.data;
      }

      if (response.success) {
        return {
          data: filteredData,
          success: true,
          total: filteredData.length,
        };
      }

      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error) {
      console.error('获取我的加入申请失败:', error);
      // 注意：这是 ProTable request 函数的特殊处理模式
      // 错误已被全局错误处理捕获并显示错误提示，这里返回空数据让表格显示空状态
      // 这是为了在错误已由全局处理显示的情况下，避免表格显示错误状态
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  }, []);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  }, []);

  // 撤回申请
  const handleCancel = async (id: string) => {
    setLoading(true);
    try {
      const response = await cancelJoinRequest(id);

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.message.applicationCancelled' }));
        if (actionRef.current?.reload) {
          actionRef.current.reload();
        }
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

  const columns: ColumnsType<API.JoinRequestDetail> = [
    {
      title: intl.formatMessage({ id: 'pages.table.companyName' }),
      dataIndex: 'companyName',
      render: (_, record: API.JoinRequestDetail) => <strong>{record.companyName}</strong>,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.applyReason' }),
      dataIndex: 'reason',
      ellipsis: true,
      render: (text: string | null | undefined) => text || <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.table.noReason' })}</span>,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.applyTime' }),
      dataIndex: 'createdAt',
      sorter: true,
      render: (_, record: API.JoinRequestDetail) => formatDateTime(record.createdAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'status',
      render: (_, record: API.JoinRequestDetail) => {
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
      render: (_, record: API.JoinRequestDetail) => {
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
      fixed: 'right',
      width: 150,
      render: (_, record: API.JoinRequestDetail) => {
        if (record.status === 'pending') {
          return (
            <Button
              type="link"
              danger
              icon={<CloseCircleOutlined />}
              loading={loading}
              onClick={() => {
                modal.confirm({
                  title: intl.formatMessage({ id: 'pages.modal.confirmCancel' }),
                  content: intl.formatMessage({ id: 'pages.modal.cancelContent' }),
                  okText: intl.formatMessage({ id: 'pages.table.ok' }),
                  okButtonProps: { danger: true },
                  cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
                  onOk: () => handleCancel(record.id),
                });
              }}
            >
              {intl.formatMessage({ id: 'pages.button.cancelRequest' })}
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <FileTextOutlined />
          {intl.formatMessage({ id: 'pages.joinRequests.my.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
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
      {/* 搜索表单 */}
      <SearchFormCard style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={() => actionRef.current?.reload?.()}
          style={{ gap: 8 }}
        >
          <Form.Item name="keyword" style={{ marginBottom: 0 }}>
            <Input
              placeholder={intl.formatMessage({ id: 'pages.joinRequests.search.companyPlaceholder' })}
              allowClear
              onPressEnter={() => actionRef.current?.reload?.()}
              style={{ width: 220 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" onClick={() => actionRef.current?.reload?.()}>
                {intl.formatMessage({ id: 'pages.button.search' })}
              </Button>
              <Button
                onClick={() => {
                  searchForm.resetFields();
                  actionRef.current?.reload?.();
                }}
              >
                {intl.formatMessage({ id: 'pages.button.reset' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      <DataTable<API.JoinRequestDetail>
        columns={columns}
        actionRef={actionRef}
        scroll={{ x: 'max-content' }}
        request={fetchMyRequests}
        rowKey="id"
        pagination={{
          pageSize: 10,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
    </PageContainer>
  );
};

export default MyJoinRequests;
