
import React from 'react';
import { Card } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
    searchCard: css`
    border-radius: ${token.borderRadiusLG}px;
    margin-bottom: ${token.margin}px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid ${token.colorBorderSecondary};
    
    .ant-card-body {
      padding: ${token.paddingLG}px;
    }
    
    // Ensure last direct form item doesn't add extra bottom margin (for vertical layouts)
    form > .ant-form-item:last-child {
      margin-bottom: 0;
    }
  `,
}));

interface SearchFormCardProps {
    children: React.ReactNode;
    title?: React.ReactNode;
    extra?: React.ReactNode;
    style?: React.CSSProperties;
}

/**
 * Standardized container for Search Forms
 * Ensures consistent padding, border-radius and spacing
 */
const SearchFormCard: React.FC<SearchFormCardProps> = ({
    children,
    title,
    extra,
    style
}) => {
    const { styles } = useStyles();

    return (
        <Card
            title={title}
            extra={extra}
            variant="borderless"
            className={styles.searchCard}
            style={style}
        >
            {children}
        </Card>
    );
};

export default SearchFormCard;
