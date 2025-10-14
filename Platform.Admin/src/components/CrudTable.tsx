import React from 'react';
import { Table, Button, Space, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import type { TableColumnsType, TableProps } from 'antd';

export interface CrudTableColumn<T = any> extends Exclude<TableColumnsType<T>[number], undefined> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface CrudTableProps<T = any> extends Omit<TableProps<T>, 'columns'> {
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
function CrudTable<T extends Record<string, any>>({
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
  deleteConfirmTitle = "确认删除",
  deleteConfirmContent = "确定要删除这条记录吗？",
  ...tableProps
}: CrudTableProps<T>) {
  // 构建操作列
  const actionColumn: CrudTableColumn<T> = {
    key: 'actions',
    title: '操作',
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
            查看
          </Button>
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
            编辑
          </Button>
        );
      }
      
      // 删除按钮
      if (showDelete && onDelete && canDelete(record)) {
        actions.push(
          <Popconfirm
            key="delete"
            title={deleteConfirmTitle}
            description={deleteConfirmContent}
            onConfirm={() => onDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        );
      }
      
      return actions.length > 0 ? (
        <Space size="small">
          {actions}
        </Space>
      ) : null;
    },
  };
  
  // 合并列配置
  const finalColumns = showActions ? [...columns, actionColumn] : columns;
  
  return (
    <Table<T>
      columns={finalColumns}
      dataSource={data}
      loading={loading}
      rowKey={(record) => record.id || record.key}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
      }}
      {...tableProps}
    />
  );
}

export default CrudTable;


