import React, { useMemo } from 'react';
import { Card, Breadcrumb } from 'antd';
import type { BreadcrumbItemType } from 'antd/es/breadcrumb/Breadcrumb';
import { useLocation, useModel } from '@umijs/max';

type MenuTreeNode = {
  id?: string;
  name: string;
  title: string;
  path: string;
  component?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  hideInMenu: boolean;
  parentId?: string;
  children: MenuTreeNode[];
};

interface PageContainerProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  content?: React.ReactNode;
  /**
   * 是否显示面包屑
   */
  showBreadcrumb?: boolean;
  /**
   * 面包屑项，默认为空。如提供将显示在页面顶部。
   */
  breadcrumbItems?: BreadcrumbItemType[];
  /**
   * 页签列表
   */
  tabList?: { key: string; tab: React.ReactNode }[];
  /**
   * 当前激活页签的 key
   */
  tabActiveKey?: string;
  /**
   * 页签切换回调
   */
  onTabChange?: (key: string) => void;
  [key: string]: any;
}

/**
 * PageContainer 替代组件
 * 用于替换 @ant-design/pro-components 的 PageContainer
 * 
 * 优化点：
 * 1. 使用 React.memo 避免 Parent 重渲染导致的子组件无效渲染
 * 2. 精细化 useMemo 依赖，避免 initialState 中无关数据变化触发面包屑重算
 */
const PageContainer: React.FC<PageContainerProps> = React.memo(({
  children,
  style,
  title,
  extra,
  content,
  showBreadcrumb = true,
  breadcrumbItems = [],
  tabList,
  tabActiveKey,
  onTabChange,
  ghost, // 提取 ghost 属性，避免传递给原生 div
  ...restProps
}) => {
  const location = useLocation();
  // 仅监听 initialState 变化
  const { initialState } = useModel('@@initialState');
  // 提取菜单数据作为依赖项
  const userMenus = useMemo(() => (initialState as any)?.currentUser?.menus as MenuTreeNode[] | undefined, [initialState]);

  const defaultStyle: React.CSSProperties = {
    paddingBlock: 12,
    ...style,
  };

  // 递归查找当前路径对应的菜单节点链（从根到叶）
  const findChainByPath = (menus: MenuTreeNode[], targetPath: string): MenuTreeNode[] | null => {
    const traverse = (nodes: MenuTreeNode[], parents: MenuTreeNode[]): MenuTreeNode[] | null => {
      for (const node of nodes) {
        const newParents = [...parents, node];
        if (node.path === targetPath) {
          return newParents;
        }
        if (node.children && node.children.length > 0) {
          const result = traverse(node.children, newParents);
          if (result) return result;
        }
      }
      return null;
    };
    return traverse(menus, []);
  };

  // 自动生成完整面包屑链： 首页 > 父级... > 当前
  const autoItems: BreadcrumbItemType[] = useMemo(() => {
    try {
      const homeItem: BreadcrumbItemType = { title: '首页' };
      if (!userMenus || userMenus.length === 0) {
        const lastSegment = location.pathname.split('/').filter(Boolean).pop();
        const currentTitle = (typeof title === 'string' && title) || lastSegment || '当前页面';
        return [homeItem, { title: currentTitle }];
      }

      const chain = findChainByPath(userMenus, location.pathname);
      if (!chain || chain.length === 0) {
        const lastSegment = location.pathname.split('/').filter(Boolean).pop();
        const currentTitle = (typeof title === 'string' && title) || lastSegment || '当前页面';
        return [homeItem, { title: currentTitle }];
      }

      const filtered = chain.filter((n) => n.path !== '/welcome');
      const items = filtered.map<BreadcrumbItemType>((n) => ({ title: n.title || n.name }));
      return [homeItem, ...items];
    } catch {
      return [];
    }
    // 依赖项精简：只在菜单数据、路径或标题变化时重算
  }, [userMenus, location.pathname, title]);

  const finalItems = breadcrumbItems.length > 0 ? breadcrumbItems : autoItems;

  const BreadcrumbView = showBreadcrumb && finalItems.length > 0 ? (
    <div style={{ marginBottom: 12 }}>
      <Breadcrumb items={finalItems} />
    </div>
  ) : null;

  if (title || extra || content || tabList) {
    return (
      <div style={defaultStyle} {...restProps}>
        {BreadcrumbView}
        <Card
          title={title}
          extra={extra}
          style={{ border: 'none' }}
          tabList={tabList}
          activeTabKey={tabActiveKey}
          onTabChange={onTabChange}
        >
          {content}
          {children}
        </Card>
      </div>
    );
  }

  return (
    <div style={defaultStyle} {...restProps}>
      {BreadcrumbView}
      {children}
    </div>
  );
});

PageContainer.displayName = 'PageContainer';

export default PageContainer;

