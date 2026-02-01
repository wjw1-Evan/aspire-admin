
import { createStyles } from 'antd-style';

/**
 * Common styles hook for standardizing Admin UI
 * proper usage of tokens ensures dark mode compatibility
 */
const useCommonStyles = createStyles(({ token, css }) => {
  return {
    // Standard Card Style
    card: css`
      border-radius: ${token.borderRadiusLG}px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      margin-bottom: ${token.margin}px;
      
      .ant-card-head {
        border-bottom: 1px solid ${token.colorBorderSecondary};
      }
    `,

    // Search Form Area Card
    searchCard: css`
      border-radius: ${token.borderRadiusLG}px;
      margin-bottom: ${token.margin}px;
      background-color: ${token.colorBgContainer};
      padding: ${token.padding}px;
    `,

    // Stat Card
    statCard: css`
      border-radius: ${token.borderRadiusLG}px;
      height: 100%;
      transition: all 0.3s;
      
      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
      }
    `,

    // Page Container custom style to remove default padding if needed or unify it
    pageContainer: css`
      .ant-pro-page-container-children-container {
        padding-block-start: 0;
      }
    `,

    // Universal border radius helper
    rounded: css`
      border-radius: ${token.borderRadiusLG}px !important;
    `,

    // Status Tag helper (if not using standard status map)
    statusTag: css`
      padding: 0 8px;
      border-radius: ${token.borderRadiusSM}px;
    `
  };
});

export default useCommonStyles;
