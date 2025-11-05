import React, { useState } from 'react';
import { Card, Button, Space, Drawer, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CrudTable, {
  type CrudTableColumn,
  type CrudTableProps,
} from './CrudTable';
import { useCrudData, type CrudDataOptions } from '../hooks/useCrudData';

export interface CrudPageProps<T = any> {
  // 页面配置
  title?: string;

  // 表格配置
  tableColumns: CrudTableColumn<T>[];
  tableProps?: Omit<CrudTableProps<T>, 'columns' | 'data' | 'loading'>;

  // 数据操作配置
  dataOptions: CrudDataOptions<T>;

  // 表单组件
  CreateForm?: React.ComponentType<{
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }>;
  EditForm?: React.ComponentType<{
    data: T;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }>;
  ViewForm?: React.ComponentType<{ data: T; onClose: () => void }>;

  // 操作权限
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canView?: boolean;

  // 自定义渲染
  renderHeader?: () => React.ReactNode;
  renderActions?: (refresh: () => void) => React.ReactNode;

  // 事件回调
  onItemCreated?: (item: T) => void;
  onItemUpdated?: (item: T) => void;
  onItemDeleted?: (item: T) => void;
}

/**
 * 通用CRUD页面组件
 * 集成表格、表单、操作等功能
 */
function CrudPage<T extends Record<string, any>>({
  title,
  tableColumns,
  tableProps,
  dataOptions,
  CreateForm,
  EditForm,
  ViewForm,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canView = false,
  renderHeader,
  renderActions,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}: CrudPageProps<T>) {
  // 使用通用数据管理Hook
  const {
    data,
    loading,
    currentItem,
    refresh,
    loadById,
    handleCreate,
    handleUpdate,
    handleDelete,
    setCurrentItem,
  } = useCrudData<T>(dataOptions);

  // 弹窗状态
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [viewVisible, setViewVisible] = useState(false);

  // 创建操作
  const handleCreateSubmit = async (formData: any) => {
    await handleCreate(formData);
    setCreateVisible(false);
    if (onItemCreated) {
      // 这里可以传入刚创建的项目，但需要从API返回
      onItemCreated(formData);
    }
  };

  // 编辑操作
  const handleEditSubmit = async (formData: any) => {
    if (!currentItem?.id) return;

    await handleUpdate(currentItem.id, formData);
    setEditVisible(false);
    setCurrentItem(null);
    if (onItemUpdated) {
      onItemUpdated(formData);
    }
  };

  // 查看操作
  const handleView = async (record: T) => {
    if (ViewForm) {
      setCurrentItem(record);
      setViewVisible(true);
    } else if (fetchById) {
      await loadById(record.id);
      setViewVisible(true);
    }
  };

  // 编辑操作
  const handleEdit = async (record: T) => {
    if (EditForm) {
      setCurrentItem(record);
      setEditVisible(true);
    }
  };

  // 删除操作
  const handleDeleteItem = async (record: T) => {
    await handleDelete(record.id);
    if (onItemDeleted) {
      onItemDeleted(record);
    }
  };

  return (
    <Card title={title}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          {canCreate && CreateForm && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateVisible(true)}
            >
              新增
            </Button>
          )}

          <Button onClick={refresh}>刷新</Button>

          {renderActions?.(refresh)}
        </Space>

        {renderHeader?.()}
      </div>

      {/* 数据表格 */}
      <CrudTable<T>
        columns={tableColumns}
        data={data}
        loading={loading}
        showActions={canView || canEdit || canDelete}
        showView={canView}
        showEdit={canEdit}
        showDelete={canDelete}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteItem}
        {...tableProps}
      />

      {/* 创建表单弹窗 */}
      {CreateForm && (
        <Drawer
          title="新增"
          open={createVisible}
          onClose={() => setCreateVisible(false)}
          width={600}
          destroyOnHidden
        >
          <CreateForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateVisible(false)}
          />
        </Drawer>
      )}

      {/* 编辑表单弹窗 */}
      {EditForm && currentItem && (
        <Drawer
          title="编辑"
          open={editVisible}
          onClose={() => {
            setEditVisible(false);
            setCurrentItem(null);
          }}
          width={600}
          destroyOnHidden
        >
          <EditForm
            data={currentItem}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setEditVisible(false);
              setCurrentItem(null);
            }}
          />
        </Drawer>
      )}

      {/* 查看详情弹窗 */}
      {ViewForm && currentItem && (
        <Modal
          title="详情"
          open={viewVisible}
          onCancel={() => {
            setViewVisible(false);
            setCurrentItem(null);
          }}
          footer={[
            <Button
              key="close"
              onClick={() => {
                setViewVisible(false);
                setCurrentItem(null);
              }}
            >
              关闭
            </Button>,
          ]}
          width={800}
        >
          <ViewForm
            data={currentItem}
            onClose={() => {
              setViewVisible(false);
              setCurrentItem(null);
            }}
          />
        </Modal>
      )}
    </Card>
  );
}

export default CrudPage;
