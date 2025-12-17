/**
 * Layout 设置类型定义
 * 用于替代 @ant-design/pro-components 的 Settings 类型
 */
export interface LayoutSettings {
  navTheme?: 'light' | 'realDark' | 'dark';
  colorPrimary?: string;
  layout?: 'side' | 'top' | 'mix';
  contentWidth?: 'Fluid' | 'Fixed';
  fixedHeader?: boolean;
  fixSiderbar?: boolean;
  colorWeak?: boolean;
  title?: string;
  pwa?: boolean;
  logo?: string;
  iconfontUrl?: string;
  token?: {
    colorPrimary?: string;
    [key: string]: any;
  };
  collapsed?: boolean;
  [key: string]: any;
}
