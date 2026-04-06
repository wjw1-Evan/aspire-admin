export interface LayoutSettings {
  navTheme?: 'light' | 'dark' | 'realDark' | undefined;
  primaryColor?: string;
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
  token?: Record<string, any>;
  headerHeight?: number;
  splitMenus?: boolean;
  footerRender?: boolean | (() => React.ReactNode);
  rightContentRender?: boolean | ((props: any) => React.ReactNode);
}
