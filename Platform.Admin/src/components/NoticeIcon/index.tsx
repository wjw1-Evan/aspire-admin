import { useState } from 'react';
import { Badge } from 'antd';
import HeaderDropdown from '@/components/HeaderDropdown';
import { BellOutlined } from '@ant-design/icons';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import UnifiedNotificationList from '@/components/UnifiedNotificationCenter/UnifiedNotificationList';
import headerStyles from '@/components/RightContent/index.less';

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

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
          <div>
            {popoverContent}
          </div>
        )}
        trigger={['hover']}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomRight"
      >
        <span className={headerStyles.headerActionButton} onClick={() => setVisible(true)}>
          <BellOutlined />
        </span>
      </HeaderDropdown>

      <UnifiedNotificationCenter open={visible} onClose={() => setVisible(false)} />
    </>
  );
}