import React from 'react';
import { Modal, Descriptions, Tag, Space, Button } from 'antd';
import {
  ClockCircleOutlined,
  CheckOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { NoticeIconItem } from '@/services/notice';

interface NoticeDetailModalProps {
  readonly open: boolean;
  readonly notice: NoticeIconItem | null;
  readonly onClose: () => void;
  readonly onMarkAsRead: (notice: NoticeIconItem) => void;
  readonly onMarkAsUnread: (notice: NoticeIconItem) => void;
}

export default function NoticeDetailModal({
  open,
  notice,
  onClose,
  onMarkAsRead,
  onMarkAsUnread,
}: NoticeDetailModalProps) {
  if (!notice) return null;

  const getTypeText = (type: string) => {
    const typeMap = {
      notification: '通知',
      message: '消息',
      event: '待办',
    };
    return typeMap[type?.toLowerCase() as keyof typeof typeMap] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap = {
      notification: 'blue',
      message: 'green',
      event: 'orange',
    };
    return colorMap[type?.toLowerCase() as keyof typeof colorMap] || 'default';
  };

  return (
    <Modal
      title="通知详情"
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        notice.read ? (
          <Button
            key="unread"
            icon={<EyeOutlined />}
            onClick={() => onMarkAsUnread(notice)}
          >
            标记为未读
          </Button>
        ) : (
          <Button
            key="read"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => onMarkAsRead(notice)}
          >
            标记为已读
          </Button>
        ),
      ]}
    >
      <Descriptions column={1} bordered>
        <Descriptions.Item label="标题">
          <Space>
            <strong>{notice.title}</strong>
            {!notice.read && <Tag color="red">未读</Tag>}
            {notice.read && <Tag color="default">已读</Tag>}
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="类型">
          <Tag color={getTypeColor(notice.type)}>
            {getTypeText(notice.type)}
          </Tag>
        </Descriptions.Item>

        {notice.description && (
          <Descriptions.Item label="内容">
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {notice.description}
            </div>
          </Descriptions.Item>
        )}

        {notice.status && (
          <Descriptions.Item label="状态">
            <Tag color="blue">{notice.status}</Tag>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="时间">
          <Space>
            <ClockCircleOutlined />
            {dayjs(notice.datetime).format('YYYY-MM-DD HH:mm:ss')}
            <span style={{ color: '#999' }}>
              ({dayjs(notice.datetime).fromNow()})
            </span>
          </Space>
        </Descriptions.Item>

        {notice.extra && (
          <Descriptions.Item label="附加信息">{notice.extra}</Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  );
}
