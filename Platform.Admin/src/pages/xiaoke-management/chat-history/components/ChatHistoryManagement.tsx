import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { useIntl } from '@umijs/max';
import { Button, Tag, Space, Modal, Form, Input, Card, DatePicker } from 'antd';
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
  type ChatHistoryQueryRequest,
  type ChatHistoryDetailResponse,
} from '@/services/xiaoke/api';
import ChatHistoryDetail from './ChatHistoryDetail';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export interface ChatHistoryManagementRef {
  reload: () => void;
}

const ChatHistoryManagement = forwardRef<ChatHistoryManagementRef>((props, ref) => {
  const intl = useIntl();
  const message = useMessage();
  const { confirm } = useModal();
  const actionRef = useRef<ActionType>(null);
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<Omit<ChatHistoryQueryRequest, 'current' | 'pageSize'>>({});
  // 使用 useRef 存储最新的搜索参数，确保 request 函数能立即访问到最新值
  const searchParamsRef = useRef<Omit<ChatHistoryQueryRequest, 'current' | 'pageSize'>>({});

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<ChatHistoryDetailResponse | null>(null);

  // 获取聊天记录列表
  const fetchChatHistory = useCallback(
    async (params: any, _sort?: Record<string, any>) => {
      try {
        const { current = 1, pageSize = 10 } = params;

        // 合并搜索参数，使用 ref 确保获取最新的搜索参数
        const mergedParams = { ...searchParamsRef.current };

        const requestData: ChatHistoryQueryRequest = {
          current,
          pageSize,
          sessionId: mergedParams.sessionId,
          userId: mergedParams.userId,
          content: mergedParams.content,
          startTime: mergedParams.startTime,
          endTime: mergedParams.endTime,
          sorter: params.sorter,
        };

        const response = await getChatHistory(requestData);

        if (response.success && response.data) {
          return {
            data: response.data.data,
            success: true,
            total: response.data.total,
          };
        }

        return {
          data: [],
          success: false,
          total: 0,
        };
      } catch (error) {
        console.error('获取聊天记录列表失败:', error);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    },
    [], // 空依赖数组，因为使用 ref 来获取最新的搜索参数
  );

  // 处理搜索
  const handleSearch = useCallback(() => {
    const values = searchForm.getFieldsValue();
    // 处理日期范围
    const searchParamsData: Omit<ChatHistoryQueryRequest, 'current' | 'pageSize'> = {
      sessionId: values.sessionId,
      userId: values.userId,
      content: values.content,
      startTime: values.dateRange?.[0] ? dayjs(values.dateRange[0]).toISOString() : undefined,
      endTime: values.dateRange?.[1] ? dayjs(values.dateRange[1]).toISOString() : undefined,
    };
    // 同时更新 state 和 ref，ref 确保 request 函数能立即访问到最新值
    searchParamsRef.current = searchParamsData;
    setSearchParams(searchParamsData);
    // 重置到第一页并重新加载数据
    if (actionRef.current?.reloadAndReset) {
      actionRef.current.reloadAndReset();
    } else if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  }, [searchForm]);

  // 重置搜索
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    // 同时更新 state 和 ref
    searchParamsRef.current = {};
    setSearchParams({});
    if (actionRef.current?.reloadAndReset) {
      actionRef.current.reloadAndReset();
    } else if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  }, [searchForm]);

  // 处理查看详情
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

  // 处理删除
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
            if (actionRef.current?.reload) {
              actionRef.current.reload();
            }
          } else {
            message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteFailed' }));
        }
      },
    });
  }, [intl]);

  // 处理关闭详情
  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setDetailData(null);
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      if (actionRef.current?.reload) {
        actionRef.current.reload();
      }
    },
  }), []);

  const columns: ColumnsType<ChatHistoryListItem> = [
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.sessionId' }),
      dataIndex: 'sessionId',
      key: 'sessionId',
      width: 200,
      ellipsis: true,
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
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.messageCount' }),
      dataIndex: 'messageCount',
      key: 'messageCount',
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.lastMessageAt' }),
      dataIndex: 'lastMessageAt',
      key: 'lastMessageAt',
      width: 180,
      render: (value: string) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
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
      {/* 搜索表单 */}
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

      <DataTable<ChatHistoryListItem>
        actionRef={actionRef}
        rowKey="sessionId"
        scroll={{ x: 'max-content' }}
        request={fetchChatHistory}
        columns={columns}
        search={false}
        pagination={{
          pageSize: 10,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 聊天记录详情抽屉 */}
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
