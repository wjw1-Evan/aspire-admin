import { createStyles } from 'antd-style';

export const useNoticeStyles = createStyles(({ css }) => ({
  notificationPanel: css`
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
    overflow: hidden;
    width: 380px;
  `,
  darkNotificationPanel: css`
    background: rgba(20, 20, 20, 0.7);
    backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  `,
  notificationHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  `,
  notificationStats: css`
    display: flex;
    justify-content: space-around;
    padding: 8px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-size: 13px;
    background: rgba(0, 0, 0, 0.02);
  `,
  notificationList: css`
    max-height: 480px;
    overflow-y: auto;
    padding: 8px;
  `,
  notificationItem: css`
    display: flex;
    padding: 12px;
    border-radius: 8px;
    transition: all 0.3s ease;
    cursor: pointer;
    margin-bottom: 4px;
    position: relative;
    overflow: hidden;

    &:hover {
      background: rgba(0, 0, 0, 0.03);
      transform: translateY(-1px);
    }
  `,
  levelIndicator: css`
    width: 4px;
    height: 80%;
    position: absolute;
    left: 0;
    top: 10%;
    border-radius: 0 4px 4px 0;
  `,
  info: css`background-color: #1677ff;`,
  success: css`background-color: #52c41a;`,
  warning: css`background-color: #faad14;`,
  error: css`background-color: #ff4d4f;`,
  notificationContent: css`
    flex: 1;
    margin-left: 12px;
  `,
  notificationTitle: css`
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
    color: rgba(0, 0, 0, 0.85);
  `,
  notificationDesc: css`
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  emptyState: css`
    padding: 40px 0;
    text-align: center;
    color: rgba(0, 0, 0, 0.25);
  `,
  loadingMore: css`
    padding: 12px;
    text-align: center;
  `,
  noMore: css`
    padding: 12px;
    text-align: center;
    color: rgba(0, 0, 0, 0.25);
    font-size: 12px;
  `,
  notificationLoadMore: css`
    padding: 12px;
    text-align: center;
  `,
}));
