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
function DataTable<T extends Record<string, any> = any>(
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
  // 初始化时从传入的 pagination 配置中获取 pageSize
  // 支持 pageSize 和 defaultPageSize（兼容 antd Table 的两种写法）
  const initialPageSize = typeof pagination === 'object' 
    ? (pagination.pageSize ?? pagination.defaultPageSize ?? 10)
    : 10;
  
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: initialPageSize,
    total: 0,
  });
  const [sorter, setSorter] = useState<Record<string, 'ascend' | 'descend'>>({});
  
  // 使用 ref 存储最新的 sorter 和 paginationState，避免闭包问题
  const sorterRef = useRef(sorter);
  const paginationStateRef = useRef(paginationState);
  
  useEffect(() => {
    sorterRef.current = sorter;
  }, [sorter]);
  
  useEffect(() => {
    paginationStateRef.current = paginationState;
  }, [paginationState]);

  const loadData = useCallback(async (page?: number, pageSize?: number) => {
    if (!request) return;

    setLoading(true);
    try {
      const params: RequestParams = {
        current: page || paginationState.current,
        pageSize: pageSize || paginationState.pageSize,
      };

      const result = await request(params, sorterRef.current);
      
      if (result.success) {
        setDataSource(result.data || []);
        setPaginationState(prev => ({
          ...prev,
          current: params.current || 1,
          pageSize: params.pageSize || prev.pageSize, // 保持当前 pageSize，除非明确指定
          total: result.total || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  }, [request, paginationState.current, paginationState.pageSize]);

  // 暴露方法给 actionRef
  useImperativeHandle(
    actionRef || ref,
    () => ({
      reload: () => {
        loadData();
      },
      reloadAndReset: () => {
        setPaginationState(prev => ({ ...prev, current: 1 }));
        loadData(1);
      },
      reset: () => {
        setPaginationState(prev => ({ ...prev, current: 1 }));
        setSorter({});
        loadData(1);
      },
      clearSelected: () => {
        // 需要外部处理选中状态
      },
    }),
    [loadData]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTableChange = useCallback((
    pag: any,
    filters: any,
    sorterInfo: any
  ) => {
    const newSorter: Record<string, 'ascend' | 'descend'> = {};
    if (sorterInfo && sorterInfo.order) {
      newSorter[sorterInfo.field] = sorterInfo.order;
    }
    setSorter(newSorter);
    
    // 当用户改变pageSize时，pag.pageSize会有值；改变页码时，pag.current会有值
    // 计算新的分页参数（使用 ref 获取最新的 state，避免闭包问题）
    const currentPaginationState = paginationStateRef.current;
    const newCurrent = pag.current !== undefined ? pag.current : currentPaginationState.current;
    const newPageSize = pag.pageSize !== undefined ? pag.pageSize : currentPaginationState.pageSize;
    
    setPaginationState(prev => {
      const newPagination = {
        current: pag.current !== undefined ? pag.current : prev.current,
        pageSize: pag.pageSize !== undefined ? pag.pageSize : prev.pageSize,
        total: prev.total,
      };
      return newPagination;
    });
    
    // 使用计算好的分页参数加载数据（使用 ref 获取最新值，避免闭包问题）
    loadData(newCurrent, newPageSize);
  }, [loadData]);

  const mergedPagination: TableProps<T>['pagination'] = useMemo(() => {
    if (pagination === false) return false;
    
    return {
      // 先合并传入的配置（包括 pageSizeOptions 等）
      ...(typeof pagination === 'object' ? pagination : {}),
      // 然后用 state 覆盖，确保 state 的优先级（用户操作后的状态）
      current: paginationState.current,
      pageSize: paginationState.pageSize,
      total: paginationState.total,
      // 默认配置
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
    };
  }, [pagination, paginationState]);

  return (
    <div>
      {toolbar && toolbar.actions && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            {toolbar.actions}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadData()}
            >
              刷新
            </Button>
          </Space>
        </div>
      )}
      <Table<T>
        {...tableProps}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        pagination={mergedPagination}
        onChange={handleTableChange}
      />
    </div>
  );
}

const DataTableWithRef = forwardRef(DataTable) as <T extends Record<string, any> = any>(
  props: DataTableProps<T> & { ref?: React.Ref<ActionType> }
) => React.ReactElement;

export { DataTableWithRef as DataTable };
export default DataTableWithRef;
