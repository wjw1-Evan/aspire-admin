import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
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
  type ChatHistoryDetailResponse,
} from '@/services/xiaoke/api';
import ChatHistoryDetail from './ChatHistoryDetail';
import dayjs from 'dayjs';
import { ProTable, ProColumns } from '@ant-design/pro-table';
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
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<ChatHistoryDetailResponse | null>(null);

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
  }, [intl, message]);

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
          } else {
            message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteFailed' }));
        }
      },
    });
  }, [intl, message, confirm]);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setDetailData(null);
  }, []);

  useImperativeHandle(ref, () => ({
    reload: () => {
      tableRef.current?.querySelector('button[data-action="reload"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    },
  }), []);

  const columns: ProColumns<ChatHistoryListItem>[] = [
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
      render: (dom: any, record: ChatHistoryListItem) => (
        <Space wrap>
          {(record.participants || []).map((participantId) => (
            <Tag key={participantId}>
              {record.participantNames?.[participantId] || participantId}
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
      render: (dom: any) => dom || '-',
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
      render: (dom: any) =>
        dom ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      render: (dom: any) => dayjs(dom).format('YYYY-MM-DD HH:mm:ss'),
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
      <ProTable<ChatHistoryListItem>
        headerTitle={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.title', defaultMessage: '聊天记录管理' })}
        actionRef={tableRef as any}
        rowKey="sessionId"
        search={{
          labelWidth: 'auto',
        }}
        request={async (params: any) => {
          const { current, pageSize, sessionId, userId, content, dateRange, ...rest } = params;
          const resp = await getChatHistory({
            page: current,
            pageSize,
            sessionId,
            userId,
            content,
            startTime: dateRange?.[0] ? dayjs(dateRange[0]).toISOString() : undefined,
            endTime: dateRange?.[1] ? dayjs(dateRange[1]).toISOString() : undefined,
            ...rest,
          } as PageParams);
          if (resp.success && resp.data) {
            return { data: resp.data.queryable || [], total: resp.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
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
