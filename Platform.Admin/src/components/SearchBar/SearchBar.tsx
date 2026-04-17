import React, { useCallback } from 'react';
import { Form, Input, Button, Space, Card } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';


const useStyles = createStyles(({ token, css }) => ({
  searchCard: {
    borderRadius: `${token.borderRadiusLG}px`,
    marginBottom: `${token.margin}px`,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    border: `1px solid ${token.colorBorderSecondary}`,
    '.ant-card-body': {
      padding: `${token.paddingLG}px`,
    },
  },
  formItem: css`
    margin-bottom: 0 !important;
  `,
}));

export interface SearchBarProps {
  /** 初始搜索参数 */
  initialParams?: any;
  /** 搜索参数变化回调 */
  onSearch?: (params: any) => void;
  /** 搜索按钮文本 */
  searchText?: string;
  /** 重置按钮文本 */
  resetText?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否显示搜索按钮 */
  showSearchButton?: boolean;
  /** 是否显示重置按钮 */
  showResetButton?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 极简版 SearchBar
 * 仅支持 search 关键词搜索，符合后端 PageParams 标准
 */
const SearchBar: React.FC<SearchBarProps> = ({
  initialParams = {},
  onSearch,
  searchText = '搜索',
  resetText = '重置',
  placeholder = '请输入关键词...',
  showSearchButton = true,
  showResetButton = false,
  compact = false,
  style,
}) => {
  const { styles } = useStyles();
  const [form] = Form.useForm();

  const handleSearch = useCallback((values: { search?: string }) => {
    onSearch?.({
      ...initialParams,
      page: 1,
      search: values.search || '',
    });
  }, [onSearch, initialParams]);

  const handleReset = useCallback(() => {
    form.resetFields();
    onSearch?.({
      ...initialParams,
      page: 1,
      search: '',
    });
  }, [form, onSearch, initialParams]);

  return (
    <Card variant="borderless" className={styles.searchCard} style={style}>
      <Form
        form={form}
        layout="inline"
        onFinish={handleSearch}
        initialValues={{ search: initialParams.search }}
        style={{ gap: '16px' }}
      >
        <Form.Item name="search" className={styles.formItem}>
          <Input
            placeholder={placeholder}
            prefix={<SearchOutlined />}
            style={{ width: compact ? 200 : 300 }}
            allowClear
            onPressEnter={() => form.submit()}
          />
        </Form.Item>
        
        <Form.Item className={styles.formItem}>
          <Space>
            {showSearchButton && (
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                {searchText}
              </Button>
            )}
            {showResetButton && (
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                {resetText}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SearchBar;
