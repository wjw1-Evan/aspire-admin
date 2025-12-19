import React from 'react';
import { Drawer, Descriptions, List, Avatar, Tag, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useIntl } from '@umijs/max';
import type { ChatHistoryDetailResponse } from '@/services/xiaoke/api';

interface ChatHistoryDetailProps {
  visible: boolean;
  detail: ChatHistoryDetailResponse | null;
  onClose: () => void;
}

const ChatHistoryDetail: React.FC<ChatHistoryDetailProps> = ({
  visible,
  detail,
  onClose,
}) => {
  const intl = useIntl();
  if (!detail) return null;

  const { session, messages } = detail;

  return (
    <Drawer
      title={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.title' })}
      placement="right"
      width={800}
      onClose={onClose}
      open={visible}
    >
      <Descriptions
        title={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.sessionInfo' })}
        bordered
        column={1}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.sessionId' })}>
          {session.id}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.participants' })}>
          <Space>
            {session.participants.map((participantId) => (
              <Tag key={participantId}>
                {session.participantNames[participantId] || participantId}
              </Tag>
            ))}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.messageCount' })}>
          {messages.length}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.createdAt' })}>
          {dayjs(session.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.lastMessageAt' })}>
          {session.lastMessageAt
            ? dayjs(session.lastMessageAt).format('YYYY-MM-DD HH:mm:ss')
            : '-'}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <h3>{intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.messageList' })}</h3>
        <List
          dataSource={messages}
          renderItem={(message) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    <span>{message.senderName || message.senderId}</span>
                    <Tag color={message.isRecalled ? 'default' : 'blue'}>
                      {message.isRecalled
                        ? intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.messageRecalled' })
                        : message.type}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {dayjs(message.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </span>
                  </Space>
                }
                description={
                  message.isRecalled ? (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>
                      {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.messageRecalled' })}
                    </span>
                  ) : (
                    <div>
                      {message.content && <div>{message.content}</div>}
                      {message.attachment && (
                        <div style={{ marginTop: 8 }}>
                          <Tag>
                            {intl.formatMessage({ id: 'pages.xiaokeManagement.chatHistory.detail.attachment' })}:{' '}
                            {message.attachment.name}
                          </Tag>
                        </div>
                      )}
                    </div>
                  )
                }
              />
            </List.Item>
          )}
        />
      </div>
    </Drawer>
  );
};

export default ChatHistoryDetail;
