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
  
}
