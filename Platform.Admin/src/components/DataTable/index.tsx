import React, { useEffect, useState, useImperativeHandle, forwardRef, useCallback, useMemo, useRef } from 'react';
import { Table, Space, Button } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import type { ActionType, RequestData, RequestParams } from '@/types/pro-components';

interface DataTableProps<T = any> extends Omit<TableProps<T>, 'dataSource' | 'loading' | 'pagination'> {
  request?: (params: RequestParams, sort?: Record<string, 'ascend' | 'descend'>) => Promise<RequestData<T>>;
  actionRef?: React.RefObject<ActionType | null>;
  columns: ColumnsType<T>;
  rowKey?: string | ((record: T) => string);
  search?: boolean;
  toolbar?: {
    actions?: React.ReactNode[];
  };
  pagination?: TableProps<T>['pagination'] | false;
}

/**
 * DataTable 组件
 * 用于替代 ProTable，提供类似的功能但使用 antd Table
 */
/**
 * 🔧 静态处理函数：规范化表格列配置
 * 移出组件内部以避免在渲染期间被重复创建，即使有 useCallback 也不如静态函数高效
 */
const normalizeColumns = <T extends Record<string, any>>(cols: ColumnsType<T>): ColumnsType<T> => {
  return (cols || []).map((col: any) => {
    const { width, children, key, dataIndex, fixed, ...rest } = col;
    const normalized: any = {
      ...rest,
      key,
      dataIndex,
    };

    // 递归处理子列
    if (children && Array.isArray(children)) {
      normalized.children = normalizeColumns(children as ColumnsType<T>);
    }

    // 移除固定宽度以便自动根据内容调整，增强自适应能力
    if (width !== undefined) {
      normalized.width = undefined;
    }

    // 统一固定操作列在右侧
    const columnKey = key || (Array.isArray(dataIndex) ? dataIndex.join('.') : dataIndex);
    if (columnKey === 'action') {
      normalized.fixed = fixed || 'right';
    } else if (fixed !== undefined) {
      normalized.fixed = fixed;
    }

    return normalized;
  });
};

/**
 * DataTable 组件
 * 用于替代 ProTable，提供类似的功能但更轻量
 */
function DataTableInner<T extends Record<string, any> = any>(
  {
    request,
    actionRef,
    columns,
    rowKey = 'id',
    search = false,
    toolbar,
    pagination = {},
    ...tableProps
  }: DataTableProps<T>,
  ref: React.Ref<ActionType>
) {
  const [dataSource, setDataSource] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const initialPageSize = typeof pagination === 'object'
    ? (pagination.pageSize ?? pagination.defaultPageSize ?? 10)
    : 10;

  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: initialPageSize,
    total: 0,
  });
  const [sorter, setSorter] = useState<Record<string, 'ascend' | 'descend'>>({});

  // 使用 ref 存储最新的 sorter 和 paginationState，作为 loadData 的真实依赖来源
  // 这样做可以从 loadData 的依赖数组中移除 paginationState，切断“加载数据 -> 更新状态 -> 重新创建函数 -> 再次加载”的潜在循环
  const sorterRef = useRef(sorter);
  const paginationStateRef = useRef(paginationState);

  useEffect(() => {
    sorterRef.current = sorter;
  }, [sorter]);

  useEffect(() => {
    paginationStateRef.current = paginationState;
  }, [paginationState]);

  /**
   * 核心加载逻辑
   * 依赖项仅限基础值，避免闭包陷阱和冗余触发
   */
  const loadData = useCallback(async (page?: number, pageSize?: number) => {
    if (!request) return;

    setLoading(true);
    try {
      const targetPage = page || paginationStateRef.current.current;
      const targetPageSize = pageSize || paginationStateRef.current.pageSize;

      const params: RequestParams = {
        current: targetPage,
        pageSize: targetPageSize,
      };

      const result = await request(params, sorterRef.current);

      if (result.success) {
        setDataSource(result.data || []);
        setPaginationState(prev => {
          // 仅在数据真实变化时更新状态，减少不必要的下层组件刷帧
          if (prev.current === targetPage && prev.pageSize === targetPageSize && prev.total === result.total) {
            return prev;
          }
          return {
            ...prev,
            current: targetPage,
            pageSize: targetPageSize,
            total: result.total || 0,
          };
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  }, [request]); // 🛡️ 核心修复：移除对 paginationState.current 的依赖

  // 暴露方法给 actionRef (ProTable 标准接口)
  useImperativeHandle(
    actionRef || ref,
    () => ({
      reload: () => {
        loadData();
      },
      reloadAndReset: () => {
        loadData(1);
      },
      reset: () => {
        setSorter({});
        loadData(1);
      },
      clearSelected: () => {
        // 由外部 state 处理选中逻辑
      },
    }),
    [loadData]
  );

  // 初始加载及参数变化监听
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 记忆化处理：列定义与滚动配置
  const processedColumns = useMemo(() => normalizeColumns(columns), [columns]);

  const mergedScroll = useMemo(() => {
    const defaultScroll = { x: 'max-content' as const };
    if (!tableProps.scroll) return defaultScroll;
    return { ...defaultScroll, ...tableProps.scroll };
  }, [tableProps.scroll]);

  const handleTableChange = useCallback((
    pag: any,
    _filters: any,
    sorterInfo: any
  ) => {
    const newSorter: Record<string, 'ascend' | 'descend'> = {};
    if (sorterInfo && sorterInfo.order) {
      const field = Array.isArray(sorterInfo.field) ? sorterInfo.field.join('.') : sorterInfo.field;
      newSorter[field] = sorterInfo.order;
    }
    setSorter(newSorter);

    const newCurrent = pag.current ?? paginationStateRef.current.current;
    const newPageSize = pag.pageSize ?? paginationStateRef.current.pageSize;

    // 立即加载新参数下的数据
    loadData(newCurrent, newPageSize);
  }, [loadData]);

  const mergedPagination: TableProps<T>['pagination'] = useMemo(() => {
    if (pagination === false) return false;

    return {
      ...(typeof pagination === 'object' ? pagination : {}),
      current: paginationState.current,
      pageSize: paginationState.pageSize,
      total: paginationState.total,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
    };
  }, [pagination, paginationState]);

  return (
    <div>
      {toolbar?.actions && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            {toolbar.actions}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadData()}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </div>
      )}
      <Table<T>
        {...tableProps}
        tableLayout={tableProps.tableLayout ?? 'auto'}
        scroll={mergedScroll}
        columns={processedColumns}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        pagination={mergedPagination}
        onChange={handleTableChange}
      />
    </div>
  );
}

// 使用 React.memo 配合 forwardRef 进行渲染优化
const DataTable = React.memo(forwardRef(DataTableInner)) as <T extends Record<string, any> = any>(
  props: DataTableProps<T> & { ref?: React.Ref<ActionType> }
) => React.ReactElement;

export { DataTable };
export default DataTable;

