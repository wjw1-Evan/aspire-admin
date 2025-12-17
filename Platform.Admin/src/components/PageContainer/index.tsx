import React from 'react';
import { Card } from 'antd';

interface PageContainerProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  content?: React.ReactNode;
  [key: string]: any;
}

/**
 * PageContainer 替代组件
 * 用于替换 @ant-design/pro-components 的 PageContainer
 */
const PageContainer: React.FC<PageContainerProps> = ({
  children,
  style,
  title,
  extra,
  content,
  ...restProps
}) => {
  const defaultStyle: React.CSSProperties = {
    paddingBlock: 12,
    ...style,
  };

  if (title || extra || content) {
    return (
      <Card
        title={title}
        extra={extra}
        style={defaultStyle}
        {...restProps}
      >
        {content}
        {children}
      </Card>
    );
  }

  return (
    <div style={defaultStyle} {...restProps}>
      {children}
    </div>
  );
};

export default PageContainer;
