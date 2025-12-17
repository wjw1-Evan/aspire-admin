/**
 * ProComponents 类型定义替代
 * 用于替代 @ant-design/pro-components 的类型定义
 */
import type { TableColumnsType, TableProps } from 'antd';
import type { RefObject } from 'react';

// ActionType 用于表格操作引用
export interface ActionType {
  reload?: () => void;
  reloadAndReset?: () => void;
  reset?: () => void;
  clearSelected?: () => void;
  [key: string]: any;
}

// ProColumns 使用 antd 的 TableColumnsType
export type ProColumns<T = any> = TableColumnsType<T>;

// ProTable 的 request 函数类型
export interface RequestData<T = any> {
  data: T[];
  success: boolean;
  total: number;
}

export type RequestParams = {
  current?: number;
  pageSize?: number;
  [key: string]: any;
};

export type RequestDataParams = RequestParams & {
  [key: string]: any;
};
