declare module 'slash2';
declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.bmp';
declare module '*.tiff';
declare module 'omit.js';
declare module 'numeral';
declare module 'mockjs';
declare module 'react-fittext';

declare const REACT_APP_ENV: 'test' | 'dev' | 'pre' | false;

// 全局 API 类型定义
declare namespace API {
  // 分页参数
  interface PageParams {
    current?: number;
    pageSize?: number;
    keyword?: string;
  }
  
  // 统一响应格式
  interface Response<T = any> {
    success: boolean;
    data?: T;
    errorCode?: string;
    errorMessage?: string;
    timestamp: string;
    traceId?: string;
  }
  
  // 数据源相关类型
  enum DataSourceType {
    MySql = 1,
    PostgreSQL = 2,
    Oracle = 3,
    MongoDB = 4,
    RestApi = 5,
    IoT = 6,
    LogFile = 7,
    MessageQueue = 8,
  }

  enum DataSourceStatus {
    Active = 1,
    Offline = 2,
    Error = 3,
    Testing = 4,
  }

  interface DataSource {
    id?: string;
    name: string;
    title: string;
    description?: string;
    dataSourceType: DataSourceType;
    connectionString?: string;
    connectionConfig: Record<string, any>;
    status: DataSourceStatus;
    lastTestedAt?: string;
    lastErrorMessage?: string;
    isEnabled: boolean;
    tags: string[];
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  }

  interface DataPipeline {
    id?: string;
    name: string;
    title: string;
    description?: string;
    dataSourceIds: string[];
    transformRules: any[];
    scheduleConfig?: any;
    status: string;
    lastExecutionAt?: string;
    createdAt: string;
    updatedAt: string;
  }
}
