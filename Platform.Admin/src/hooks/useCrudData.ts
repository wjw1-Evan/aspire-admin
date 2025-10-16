import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';

export interface CrudDataOptions<T> {
  // 数据获取
  fetchList: () => Promise<T[]>;
  fetchById?: (id: string) => Promise<T>;
  
  // CRUD操作
  create?: (data: any) => Promise<T>;
  update?: (id: string, data: any) => Promise<T>;
  delete?: (id: string) => Promise<boolean>;
  
  // 批量操作
  bulkDelete?: (ids: string[]) => Promise<boolean>;
  
  // 自动加载
  autoLoad?: boolean;
  
  // 错误处理
  onError?: (error: any) => void;
}

export interface CrudDataResult<T> {
  // 数据状态
  data: T[];
  loading: boolean;
  error: Error | null;
  
  // 当前项状态
  currentItem: T | null;
  itemLoading: boolean;
  
  // 数据操作
  refresh: () => Promise<void>;
  loadById: (id: string) => Promise<void>;
  
  // CRUD操作
  handleCreate: (data: any) => Promise<void>;
  handleUpdate: (id: string, data: any) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleBulkDelete: (ids: string[]) => Promise<void>;
  
  // 状态管理
  clearError: () => void;
  setCurrentItem: (item: T | null) => void;
}

/**
 * 通用CRUD数据管理Hook
 * 封装常见的数据获取、增删改查操作
 */
export function useCrudData<T = any>(options: CrudDataOptions<T>): CrudDataResult<T> {
  const {
    fetchList,
    fetchById,
    create,
    update,
    delete: deleteFunc,
    bulkDelete,
    autoLoad = true,
    onError,
  } = options;

  // 数据状态
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // 当前项状态
  const [currentItem, setCurrentItem] = useState<T | null>(null);
  const [itemLoading, setItemLoading] = useState(false);

  // 错误处理
  const handleError = useCallback((err: any) => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    if (onError) {
      onError(error);
    } else {
      message.error(error.message);
    }
  }, [onError]);

  // 刷新数据列表
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchList();
      setData(result);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchList, handleError]);

  // 根据ID加载单个项目
  const loadById = useCallback(async (id: string) => {
    if (!fetchById) return;
    
    try {
      setItemLoading(true);
      const result = await fetchById(id);
      setCurrentItem(result);
    } catch (err) {
      handleError(err);
    } finally {
      setItemLoading(false);
    }
  }, [fetchById, handleError]);

  // 创建操作
  const handleCreate = useCallback(async (data: any) => {
    if (!create) return;
    
    try {
      setLoading(true);
      await create(data);
      message.success('创建成功');
      await refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [create, refresh, handleError]);

  // 更新操作
  const handleUpdate = useCallback(async (id: string, data: any) => {
    if (!update) return;
    
    try {
      setItemLoading(true);
      await update(id, data);
      message.success('更新成功');
      await refresh();
      setCurrentItem(null);
    } catch (err) {
      handleError(err);
    } finally {
      setItemLoading(false);
    }
  }, [update, refresh, handleError]);

  // 删除操作
  const handleDelete = useCallback(async (id: string) => {
    if (!deleteFunc) return;
    
    try {
      setLoading(true);
      await deleteFunc(id);
      message.success('删除成功');
      await refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [deleteFunc, refresh, handleError]);

  // 批量删除操作
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    if (!bulkDelete) return;
    
    try {
      setLoading(true);
      await bulkDelete(ids);
      message.success(`删除了 ${ids.length} 条记录`);
      await refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [bulkDelete, refresh, handleError]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [refresh, autoLoad]);

  return {
    // 数据状态
    data,
    loading,
    error,
    
    // 当前项状态
    currentItem,
    itemLoading,
    
    // 数据操作
    refresh,
    loadById,
    
    // CRUD操作
    handleCreate,
    handleUpdate,
    handleDelete,
    handleBulkDelete,
    
    // 状态管理
    clearError,
    setCurrentItem,
  };
}

export default useCrudData;






