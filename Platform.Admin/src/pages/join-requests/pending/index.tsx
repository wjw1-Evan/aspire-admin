import { PageContainer } from '@/components';
import { Button, Space, App, Modal, Input, Grid, Form } from 'antd';
import SearchBar from '@/components/SearchBar';

const { useBreakpoint } = Grid;
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import {
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '@/services/company';
import { useModel } from '@umijs/max';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Table } from 'antd';
import type { PageParams } from '@/types/page-params';

const { TextArea } = Input;

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

const PendingJoinRequests: React.FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message, modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const tableRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const searchParamsRef = useRef<PageParams>({ search: '' });
  const [data, setData] = useState<API.JoinRequestDetail[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const companyId = initialState?.currentUser?.currentCompanyId;

      if (!companyId) {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
        setLoading(false);
        return;
      }

      const response = await getJoinRequests(companyId, 'pending');

      if (response.success && response.data) {
        let filteredData = response.data;
        if (currentParams.search) {
          const keyword = currentParams.search.toLowerCase();
          filteredData = response.data.filter(item =>
            item.username.toLowerCase().includes(keyword) ||
            (item.reason && item.reason.toLowerCase().includes(keyword))
          );
        }

        setData(filteredData);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: filteredData.length,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('获取待审核申请失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback((params: PageParams) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;
    const sortBy = sorter?.field;
    const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;

    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
      sortBy,
      sortOrder,
    };
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (record: API.JoinRequestDetail) => {
    modal.confirm({
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
          const response = await approveJoinRequest(record.id);

          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.message.applicationApproved' }));
            fetchData();
          } else {
            throw new Error(response.message || intl.formatMessage({ id: 'pages.message.operationFailed' }));
          }
        } catch (error) {
          throw error;
        } finally {
          setLoading(false);
        }
      },
    });
  };

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
          const response = await rejectJoinRequest(record.id, {
            rejectReason: rejectReason.trim(),
          });

          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.message.applicationRejected' }));
            fetchData();
          } else {
            throw new Error(response.message || intl.formatMessage({ id: 'pages.message.operationFailed' }));
          }
        } catch (error) {
          throw error;
        } finally {
          setLoading(false);
        }
      },
    });
  };

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
        const newWidth = Math.max(50, startWidth + diff);
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

    let timer: NodeJS.Timeout | null = setTimeout(() => {
      initResizeHandlers();
    }, 300);

    const observer = new MutationObserver(() => {
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
      title: intl.formatMessage({ id: 'pages.table.applicant' }),
      dataIndex: 'username',
      key: 'username',
      sorter: true,
      render: (_, record: API.JoinRequestDetail) => (
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
      key: 'reason',
      sorter: true,
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.table.noReason' })}</span>,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.applyTime' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (_, record: API.JoinRequestDetail) => formatDateTime(record.createdAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      render: () => (
        <Space>
          <ClockCircleOutlined style={{ color: '#faad14' }} />
          <span>{intl.formatMessage({ id: 'pages.table.status.pending' })}</span>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'actions',
      render: (_, record: API.JoinRequestDetail) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record)}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.button.approve' })}
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleReject(record)}
            size="small"
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
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
        </Space>
      }
    >
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        showResetButton={false}
        style={{ marginBottom: 16 }}
      />

      <div ref={tableRef}>
        <Table<API.JoinRequestDetail>
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </div>
    </PageContainer>
  );
};

export default PendingJoinRequests;