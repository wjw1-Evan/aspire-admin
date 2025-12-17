import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Table, Space, Button } from 'antd';
import type { TableProps, TableColumnsType } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ActionType, RequestData, RequestParams } from '@/types/pro-components';

interface DataTableProps<T = any> extends Omit<TableProps<T>, 'dataSource' | 'loading' | 'pagination'> {
  request?: (params: RequestParams, sort?: Record<string, 'ascend' | 'descend'>) => Promise<RequestData<T>>;
  actionRef?: React.RefObject<ActionType | null>;
  columns: TableColumnsType<T>;
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
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [sorter, setSorter] = useState<Record<string, 'ascend' | 'descend'>>({});

  const loadData = async (page?: number, pageSize?: number) => {
    if (!request) return;

    setLoading(true);
    try {
      const params: RequestParams = {
        current: page || paginationState.current,
        pageSize: pageSize || paginationState.pageSize,
      };

      const result = await request(params, sorter);
      
      if (result.success) {
        setDataSource(result.data || []);
        setPaginationState(prev => ({
          ...prev,
          current: params.current || 1,
          pageSize: params.pageSize || 10,
          total: result.total || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  };

  // 暴露方法给 actionRef
  useImperativeHandle(actionRef || ref, () => ({
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
  }));

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (
    pag: any,
    filters: any,
    sorterInfo: any
  ) => {
    const newSorter: Record<string, 'ascend' | 'descend'> = {};
    if (sorterInfo && sorterInfo.order) {
      newSorter[sorterInfo.field] = sorterInfo.order;
    }
    setSorter(newSorter);
    
    const newPagination = {
      current: pag.current || 1,
      pageSize: pag.pageSize || 10,
      total: paginationState.total,
    };
    setPaginationState(newPagination);
    
    loadData(newPagination.current, newPagination.pageSize);
  };

  const mergedPagination: TableProps<T>['pagination'] = pagination === false 
    ? false 
    : {
        current: paginationState.current,
        pageSize: paginationState.pageSize,
        total: paginationState.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        ...(typeof pagination === 'object' ? pagination : {}),
      };

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

export default DataTableWithRef;
