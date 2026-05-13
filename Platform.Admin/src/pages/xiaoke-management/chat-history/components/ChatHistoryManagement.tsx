import { DeleteOutlined, MessageOutlined, SearchOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { useIntl } from '@umijs/max';
import { Button, Input, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useRef, useState } from 'react';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
  type ChatHistoryDetailResponse,
  type ChatHistoryListItem,
  deleteChatHistory,
  getChatHistory,
  getChatHistoryDetail,
} from '@/services/xiaoke/api';
import { getErrorMessage } from '@/utils/getErrorMessage';
import ChatHistoryDetail from './ChatHistoryDetail';

const ChatHistoryManagement: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const { confirm } = useModal();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<ChatHistoryDetailResponse | null>(null);
  const [searchText, setSearchText] = useState('');

  const handleViewDetail = useCallback(
    async (record: ChatHistoryListItem) => {
      try {
        const response = await getChatHistoryDetail(record.sessionId);
        if (response.success && response.data) {
          setDetailData(response.data);
          setDetailVisible(true);
        } else {
          message.error(getErrorMessage(response, 'pages.xiaokeManagement.chatHistory.message.getDetailFailed'));
        }
      } catch (error: any) {
        message.error(
          error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.getDetailFailed' }),
        );
      }
    },
    [intl, message],
  );

  const handleDelete = useCallback(
    (record: ChatHistoryListItem) => {
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
              actionRef.current?.reload();
            } else {
              message.error(getErrorMessage(response, 'pages.xiaokeManagement.chatHistory.message.deleteFailed'));
            }
          } catch (error: any) {
            message.error(
              error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.message.deleteFailed' }),
            );
          }
        },
      });
    },
    [intl, message, confirm],
  );

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setDetailData(null);
  }, []);

  const columns: ProColumns<ChatHistoryListItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.title' }),
      dataIndex: ['topicTags', '0'],
      key: 'topicTags',
      width: 200,
      ellipsis: true,
      render: (_dom: any, record: ChatHistoryListItem) => {
        const tag = record.topicTags?.[0];
        const content =
          tag && tag !== 'assistant' && tag !== 'direct' ? (
            <span style={{ fontWeight: 500 }}>{tag}</span>
          ) : (
            <span style={{ color: '#999' }}>
              {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.defaultTitle' })}
            </span>
          );
        return <a onClick={() => handleViewDetail(record)}>{content}</a>;
      },
    },
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
      render: (_dom: any, record: ChatHistoryListItem) => (
        <Space wrap>
          {(record.participants || []).map((participantId) => (
            <Tag key={participantId}>{record.participantNames?.[participantId] || participantId}</Tag>
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
      render: (dom: any) => (dom ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-'),
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
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.table.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<ChatHistoryListItem>
        headerTitle={
          <Space size={24}>
            <Space>
              <MessageOutlined />
              {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.title' })}
            </Space>
          </Space>
        }
        actionRef={actionRef}
        rowKey="sessionId"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const resp = await getChatHistory({ ...params, search: searchText, sort, filter });
          if (resp.success && resp.data) {
            return { data: resp.data.queryable || [], total: resp.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => {
              setSearchText(value);
              actionRef.current?.reload();
            }}
            style={{ width: 260 }}
            prefix={<SearchOutlined />}
          />,
        ]}
      />

      <ChatHistoryDetail open={detailVisible} detail={detailData} onClose={handleCloseDetail} />
    </>
  );
};

export default ChatHistoryManagement;
