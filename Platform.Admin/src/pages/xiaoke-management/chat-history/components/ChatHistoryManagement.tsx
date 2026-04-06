import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useIntl } from '@umijs/max';
import { Button, Tag, Space, Modal, Form, Input, Card, DatePicker, Table } from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
  getChatHistory,
  deleteChatHistory,
  getChatHistoryDetail,
  type ChatHistoryListItem,
  type ChatHistoryDetailResponse,
} from '@/services/xiaoke/api';
import ChatHistoryDetail from './ChatHistoryDetail';
import dayjs from 'dayjs';
import type { PageParams } from '@/types';

const { RangePicker } = DatePicker;

export interface ChatHistoryManagementRef {
  reload: () => void;
}

const ChatHistoryManagement = forwardRef<ChatHistoryManagementRef>((props, ref) => {
  const intl = useIntl();
  const message = useMessage();
  const { confirm } = useModal();
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchForm] = Form.useForm();
  const [data, setData] = useState<ChatHistoryListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 10 });

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<ChatHistoryDetailResponse | null>(null);

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const resp = await getChatHistory({
        page: currentParams.page,
        pageSize: currentParams.pageSize,
        sessionId: currentParams.sessionId as string | undefined,
        userId: currentParams.userId as string | undefined,
        content: currentParams.content as string | undefined,
        startTime: currentParams.startTime as string | undefined,
        endTime: currentParams.endTime as string | undefined,
      });

      if (resp.success && resp.data) {
        setData(resp.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: resp.data!.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('获取聊天记录列表失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(() => {
    const values = searchForm.getFieldsValue();
    const searchParamsData: any = {
      page: 1,
      pageSize: searchParamsRef.current.pageSize,
      sessionId: values.sessionId,
      userId: values.userId,
      content: values.content,
      startTime: values.dateRange?.[0] ? dayjs(values.dateRange[0]).toISOString() : undefined,
      endTime: values.dateRange?.[1] ? dayjs(values.dateRange[1]).toISOString() : undefined,
    };
    searchParamsRef.current = searchParamsData;
    fetchData();
  }, [searchForm, fetchData]);

  const handleReset = useCallback(() => {
    searchForm.resetFields();
    searchParamsRef.current = { page: 1 };
    fetchData();
  }, [searchForm, fetchData]);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;

    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
    };
    fetchData();
  }, [fetchData]);

  const handleViewDetail = useCallback(async (record: ChatHistoryListItem) => {
    try {
      const response = await getChatHistoryDetail(record.sessionId);
      if (response.success && response.data) {
        setDetailData(response.data);
        setDetailVisible(true);
      } else {
        message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.getDetailFailed' }));
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.getDetailFailed' }));
    }
  }, [intl]);

  const handleDelete = useCallback((record: ChatHistoryListItem) => {
    confirm({
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.modal.confirmDelete' }),
      content: intl.formatMessage(
        { id: 'pages.xiaokeManagement.chatHistory.modal.confirmDeleteContent' },
        { sessionId: record.sessionId },
      ),
      onOk: async () => {
        try {
          const response = await deleteChatHistory(record.sessionId);
          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteSuccess' }));
            fetchData();
          } else {
            message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteFailed' }));
        }
      },
    });
  }, [intl, fetchData]);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setDetailData(null);
  }, []);

  useImperativeHandle(ref, () => ({
    reload: () => {
      fetchData();
    },
  }), [fetchData]);

  const columns: ColumnsType<ChatHistoryListItem> = [
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.sessionId' }),
      dataIndex: 'sessionId',
      key: 'sessionId',
      width: 200,
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.participants' }),
      dataIndex: 'participants',
      key: 'participants',
      width: 200,
      render: (participants: string[], record: ChatHistoryListItem) => (
        <Space wrap>
          {participants.map((participantId) => (
            <Tag key={participantId}>
              {record.participantNames[participantId] || participantId}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.lastMessage' }),
      dataIndex: 'lastMessageExcerpt',
      key: 'lastMessageExcerpt',
      width: 300,
      ellipsis: true,
      sorter: true,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.messageCount' }),
      dataIndex: 'messageCount',
      key: 'messageCount',
      width: 100,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.lastMessageAt' }),
      dataIndex: 'lastMessageAt',
      key: 'lastMessageAt',
      width: 180,
      sorter: true,
      render: (value: string) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.action' }),
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: any, record: ChatHistoryListItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.action.view' })}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
          <Form.Item name="sessionId" label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.sessionId' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.sessionId' })} style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="userId" label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.userId' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.userId' })} style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="content" label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.content' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.content' })} style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="dateRange" label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.dateRange' })}>
            <RangePicker
              showTime={{ format: 'HH:mm:ss' }}
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: 400 }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {intl.formatMessage({ id: 'pages.button.search' })}
              </Button>
              <Button onClick={handleReset}>
                {intl.formatMessage({ id: 'pages.button.reset' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Table<ChatHistoryListItem>
        dataSource={data}
        columns={columns}
        rowKey="sessionId"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
      />

      <ChatHistoryDetail
        open={detailVisible}
        detail={detailData}
        onClose={handleCloseDetail}
      />
    </>
  );
});

ChatHistoryManagement.displayName = 'ChatHistoryManagement';

export default ChatHistoryManagement;