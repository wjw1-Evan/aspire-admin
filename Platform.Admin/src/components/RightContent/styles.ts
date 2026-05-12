import { createStyles } from 'antd-style';

export const useHeaderStyles = createStyles(({ css }) => ({
  headerActionButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    min-width: 44px;
    padding: 0 12px;
    margin: 0 4px;
    cursor: pointer;
    border-radius: 22px;
    color: var(--ant-color-text);
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    line-height: 1;
    background: var(--ant-color-bg-container);
    border: 1px solid var(--ant-color-border-secondary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    &:hover {
      background: var(--ant-color-fill-tertiary);
      border-color: var(--ant-color-primary);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px) scale(1.05);

      .anticon {
        transform: rotate(8deg);
      }
    }

    &:active {
      transform: scale(0.95);
    }

    &:not(:has(span:not(.anticon))) {
      padding: 0;
      width: 44px;
      border-radius: 50%;
    }

    .anticon {
      transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `,
}));
