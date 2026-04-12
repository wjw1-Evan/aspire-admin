import { theme, Space, Badge } from 'antd';
import { Drawer } from 'antd';
import { useIntl } from '@umijs/max';
import UnifiedNotificationList from './UnifiedNotificationList';

interface UnifiedNotificationCenterProps {
  /** antd v5 推荐使用的受控开关 */
  open?: boolean;
  /** 兼容旧命名，等同于 open */
  visible?: boolean;
  onClose: () => void;
}

const UnifiedNotificationCenter: React.FC<UnifiedNotificationCenterProps> = ({
  open,
  visible,
  onClose,
}) => {
  const isOpen = open ?? visible ?? false;
  const intl = useIntl();
  const { token } = theme.useToken();

  const t = (id: string, def: string) => intl.formatMessage({ id, defaultMessage: def });

  return (
    <Drawer
      title={
        <Space size="small">
          <span>{t('pages.unifiedNotificationCenter.title', '通知中心')}</span>
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={isOpen}
      size={500}
      styles={{ body: { padding: 8, background: token.colorBgLayout } }}
    >
      <UnifiedNotificationList onItemClick={onClose} />
    </Drawer>
  );
};

export default UnifiedNotificationCenter;

