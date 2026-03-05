import { useEffect, useState } from 'react';
import { Badge } from 'antd';
import HeaderDropdown from '@/components/HeaderDropdown';
import { BellOutlined } from '@ant-design/icons';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import UnifiedNotificationList from '@/components/UnifiedNotificationCenter/UnifiedNotificationList';
import { getUnreadStatistics } from '@/services/unified-notification/api';
import headerStyles from '@/components/RightContent/index.less';

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // 获取未读数
  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadStatistics();
      if (res?.success && res.data) {
        setUnreadCount(res.data.total || 0);
      }
    } catch {
      // 静默失败
    }
  };

  // 初次加载和定时轮询未读数（每 10 秒）
  useEffect(() => {
    // 立即获取一次
    fetchUnreadCount();

    // 设置定时器，每 10 秒轮询一次
    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 10000);

    // 清理定时器
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const popoverContent = (
    <div style={{ width: 420 }}>
      <UnifiedNotificationList
        pageSize={5}
        showPagination={false}
        maxHeight={400}
        onItemClick={() => setPopoverOpen(false)}
      />
      <div
        style={{
          textAlign: 'center',
          padding: '12px 0 4px',
          borderTop: '1px solid #f0f0f0',
          marginTop: 8,
        }}
      >
        <a
          onClick={() => {
            setPopoverOpen(false);
            setVisible(true);
          }}
        >
          查看全部通知
        </a>
      </div>
    </div>
  );

  return (
    <>
      <HeaderDropdown
        dropdownRender={() => (
          <div className={headerStyles.noticePopover}>
            {popoverContent}
          </div>
        )}
        trigger={['hover']}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomRight"
      >
        <span className={headerStyles.headerActionButton} onClick={() => setVisible(true)}>
          <Badge count={unreadCount} overflowCount={99}>
            <BellOutlined />
          </Badge>
        </span>
      </HeaderDropdown>

      <UnifiedNotificationCenter open={visible} onClose={() => setVisible(false)} />
    </>
  );
}


