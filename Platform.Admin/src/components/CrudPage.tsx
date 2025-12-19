import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Drawer, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CrudTable, {
  type CrudTableColumn,
  type CrudTableProps,
} from './CrudTable';
import { useCrudData, type CrudDataOptions } from '../hooks/useCrudData';

export interface CrudPageProps<T = any> {
  // 页面配置
  readonly title?: string;

  // 表格配置
  readonly tableColumns: readonly CrudTableColumn<T>[];
  readonly tableProps?: Omit<CrudTableProps<T>, 'columns' | 'data' | 'loading'>;

  // 数据操作配置
  readonly dataOptions: CrudDataOptions<T>;

  // 表单组件
  readonly CreateForm?: React.ComponentType<{
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }>;
  readonly EditForm?: React.ComponentType<{
    data: T;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }>;
  readonly ViewForm?: React.ComponentType<{ data: T; onClose: () => void }>;

  // 操作权限
  readonly canCreate?: boolean;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
  readonly canView?: boolean;

  // 自定义渲染
  readonly renderHeader?: () => React.ReactNode;
  readonly renderActions?: (refresh: () => void) => React.ReactNode;

  // 事件回调
  readonly onItemCreated?: (item: T) => void;
  readonly onItemUpdated?: (item: T) => void;
  readonly onItemDeleted?: (item: T) => void;
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

  // 关闭创建表单
  const handleCreateClose = useCallback(() => {
    setCreateVisible(false);
  }, []);

  // 关闭编辑表单
  const handleEditClose = useCallback(() => {
    setEditVisible(false);
    setCurrentItem(null);
  }, [setCurrentItem]);

  // 关闭查看详情
  const handleViewClose = useCallback(() => {
    setViewVisible(false);
    setCurrentItem(null);
  }, [setCurrentItem]);

  // 打开创建表单
  const handleCreateOpen = useCallback(() => {
    setCreateVisible(true);
  }, []);

  // 创建操作
  const handleCreateSubmit = useCallback(async (formData: any) => {
    await handleCreate(formData);
    setCreateVisible(false);
    if (onItemCreated) {
      // 这里可以传入刚创建的项目，但需要从API返回
      onItemCreated(formData);
    }
  }, [handleCreate, onItemCreated]);

  // 编辑操作
  const handleEditSubmit = useCallback(async (formData: any) => {
    if (!currentItem?.id) return;

    await handleUpdate(currentItem.id, formData);
    setEditVisible(false);
    setCurrentItem(null);
    if (onItemUpdated) {
      onItemUpdated(formData);
    }
  }, [currentItem, handleUpdate, onItemUpdated, setCurrentItem]);

  // 查看操作
  const handleView = useCallback(async (record: T) => {
    if (ViewForm) {
      setCurrentItem(record);
      setViewVisible(true);
    } else if (dataOptions.fetchById) {
      await loadById(record.id);
      setViewVisible(true);
    }
  }, [ViewForm, dataOptions.fetchById, loadById, setCurrentItem]);

  // 编辑操作
  const handleEdit = useCallback(async (record: T) => {
    if (EditForm) {
      setCurrentItem(record);
      setEditVisible(true);
    }
  }, [EditForm, setCurrentItem]);

  // 删除操作
  const handleDeleteItem = useCallback(async (record: T) => {
    await handleDelete(record.id);
    if (onItemDeleted) {
      onItemDeleted(record);
    }
  }, [handleDelete, onItemDeleted]);

  return (
    <Card title={title}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          {canCreate && CreateForm && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateOpen}
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
        columns={[...tableColumns]}
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
          onClose={handleCreateClose}
          size={600}
          destroyOnHidden
        >
          <CreateForm
            onSubmit={handleCreateSubmit}
            onCancel={handleCreateClose}
          />
        </Drawer>
      )}

      {/* 编辑表单弹窗 */}
      {EditForm && currentItem && (
        <Drawer
          title="编辑"
          open={editVisible}
          onClose={handleEditClose}
          size={600}
          destroyOnHidden
        >
          <EditForm
            data={currentItem}
            onSubmit={handleEditSubmit}
            onCancel={handleEditClose}
          />
        </Drawer>
      )}

      {/* 查看详情弹窗 */}
      {ViewForm && currentItem && (
        <Modal
          title="详情"
          open={viewVisible}
          onCancel={handleViewClose}
          footer={[
            <Button
              key="close"
              onClick={handleViewClose}
            >
              关闭
            </Button>,
          ]}
          width={800}
        >
          <ViewForm
            data={currentItem}
            onClose={handleViewClose}
          />
        </Modal>
      )}
    </Card>
  );
}

export default CrudPage;
