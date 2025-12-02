import React, { useState, useEffect } from 'react';
import { Drawer, Tabs, List, Button, Tag, Space, Empty, Spin, Badge } from 'antd';
import { BellOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  getUnifiedNotifications,
  markAsRead,
  getUnreadStatistics,
  type UnifiedNotificationItem,
} from '@/services/unified-notification/api';
import styles from './index.less';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface UnifiedNotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const UnifiedNotificationCenter: React.FC<UnifiedNotificationCenterProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UnifiedNotificationItem[]>([]);
  const [unreadStats, setUnreadStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const filterType = 'all';
  const sortBy = 'datetime';

  // 获取统计信息（用于显示全部的未读数）
  const fetchUnreadStats = async () => {
    try {
      const response = await getUnreadStatistics();
      if (response.success && response.data) {
        setUnreadStats(response.data);
      }
    } catch (error) {
      // 静默失败
    }
  };

  // 获取统一通知列表（仅“全部”）
  const fetchUnifiedNotifications = async () => {
    setLoading(true);
    try {
      const response = await getUnifiedNotifications(page, pageSize, filterType, sortBy);
      if (response.success && response.data) {
        setNotifications(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始化时获取数据
  useEffect(() => {
    if (visible) {
      fetchUnreadStats();
      fetchUnifiedNotifications();
    }
  }, [visible, page, pageSize]);

  // 标记为已读
  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      fetchUnifiedNotifications();
      fetchUnreadStats();
    } catch (error) {
      // 静默失败
    }
  };

  // 获取优先级标签（仅对任务通知显示）
  const getPriorityTag = (priority?: number) => {
    const priorityMap: Record<number, { label: string; color: string }> = {
      0: { label: '低', color: 'blue' },
      1: { label: '中', color: 'orange' },
      2: { label: '高', color: 'red' },
      3: { label: '紧急', color: 'volcano' },
    };
    if (priority === undefined || priority === null) return null;
    return <Tag color={priorityMap[priority]?.color}>{priorityMap[priority]?.label}</Tag>;
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Task':
        return <FileTextOutlined />;
      case 'System':
        return <AlertOutlined />;
      default:
        return <BellOutlined />;
    }
  };

  // 渲染通知项
  const renderNotificationItem = (item: UnifiedNotificationItem) => (
    <List.Item
      key={item.id}
      className={!item.read ? styles.unread : ''}
      actions={[
        !item.read && (
          <Button type="text" size="small" onClick={() => handleMarkAsRead(item.id)}>
            标记已读
          </Button>
        ),
      ]}
    >
      <List.Item.Meta
        avatar={getTypeIcon(item.type)}
        title={
          <Space>
            <span>{item.title}</span>
            {!item.read && <Badge status="processing" />}
            {item.taskPriority !== undefined && getPriorityTag(item.taskPriority)}
          </Space>
        }
        description={
          <div>
            <p>{item.description}</p>
            <small>{dayjs(item.datetime).fromNow()}</small>
          </div>
        }
      />
    </List.Item>
  );

  const tabItems = [
    {
      key: 'all',
      label: (
        <span className={styles.tabLabel}>
          <span>全部</span>
          <Badge count={unreadStats?.total} size="small" />
        </span>
      ),
      children: (
        <Spin spinning={loading}>
          <List
            dataSource={notifications}
            renderItem={renderNotificationItem}
            locale={{ emptyText: <Empty description="暂无通知" /> }}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        </Spin>
      ),
    },
  ];

  return (
    <Drawer
      title="通知中心"
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
      styles={{ body: { padding: 0 } }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} tabBarStyle={{ paddingLeft: 16, paddingRight: 16 }} />
    </Drawer>
  );
};

export default UnifiedNotificationCenter;
