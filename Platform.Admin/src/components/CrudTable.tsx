import { Table, Button, Space, App } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import type { TableColumnsType, TableProps } from 'antd';
import { useIntl } from '@umijs/max';

export interface CrudTableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: number;
  fixed?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
  [key: string]: any;
}

export interface CrudTableProps<T = any>
  extends Omit<TableProps<T>, 'columns'> {
  columns: CrudTableColumn<T>[];
  data: T[];
  loading?: boolean;

  // CRUD操作配置
  showActions?: boolean;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;

  // CRUD操作回调
  onView?: (record: T) => void;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;

  // 操作权限
  canView?: (record: T) => boolean;
  canEdit?: (record: T) => boolean;
  canDelete?: (record: T) => boolean;

  // 删除确认配置
  deleteConfirmTitle?: string;
  deleteConfirmContent?: string;
}

/**
 * 通用CRUD表格组件
 * 提供标准的查看、编辑、删除操作
 */
function CrudTable<T extends Record<string, any> = any>({
  columns,
  data,
  loading = false,
  showActions = true,
  showView = false,
  showEdit = true,
  showDelete = true,
  onView,
  onEdit,
  onDelete,
  canView = () => true,
  canEdit = () => true,
  canDelete = () => true,
  deleteConfirmTitle,
  deleteConfirmContent,
  ...tableProps
}: CrudTableProps<T>) {
  const intl = useIntl();
  const { modal } = App.useApp();

  // 构建操作列
  const actionColumn: CrudTableColumn<T> = {
    key: 'actions',
    title: intl.formatMessage({ id: 'pages.table.actions' }),
    width: 150,
    fixed: 'right',
    render: (_, record) => {
      const actions = [];

      // 查看按钮
      if (showView && onView && canView(record)) {
        actions.push(
          <Button
            key="view"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            {intl.formatMessage({ id: 'pages.table.view' })}
          </Button>,
        );
      }

      // 编辑按钮
      if (showEdit && onEdit && canEdit(record)) {
        actions.push(
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            {intl.formatMessage({ id: 'pages.table.edit' })}
          </Button>,
        );
      }

      // 删除按钮
      if (showDelete && onDelete && canDelete(record)) {
        actions.push(
          <Button
            key="delete"
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              modal.confirm({
                title: deleteConfirmTitle || intl.formatMessage({ id: 'pages.table.confirmDelete' }),
                content: deleteConfirmContent || intl.formatMessage({ id: 'pages.table.confirmDeleteContent' }),
                okText: intl.formatMessage({ id: 'pages.table.ok' }),
                okButtonProps: { danger: true },
                cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
                onOk: () => onDelete(record),
              });
            }}
          >
            {intl.formatMessage({ id: 'pages.table.delete' })}
          </Button>,
        );
      }

      return actions.length > 0 ? <Space size="small">{actions}</Space> : null;
    },
  };

  // 合并列配置
  const finalColumns: TableColumnsType<T> = showActions
    ? [...(columns as any), actionColumn as any]
    : (columns as any);

  return (
    <Table<T>
      columns={finalColumns}
      dataSource={data}
      loading={loading}
      rowKey={(record) => record.id || record.key}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          intl.formatMessage(
            { id: 'pages.table.pageInfo' },
            { start: range[0], end: range[1], total },
          ),
      }}
      {...tableProps}
    />
  );
}

export default CrudTable;
