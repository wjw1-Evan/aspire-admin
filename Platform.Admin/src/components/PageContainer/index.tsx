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
  [key: string]: any;
}

/**
 * PageContainer 替代组件
 * 用于替换 @ant-design/pro-components 的 PageContainer
 */
const PageContainer: React.FC<PageContainerProps> = ({
  children,
  style,
  title,
  extra,
  content,
  showBreadcrumb = true,
  breadcrumbItems = [],
  ...restProps
}) => {
  const location = useLocation();
  const { initialState } = useModel('@@initialState');

  const defaultStyle: React.CSSProperties = {
    paddingBlock: 12,
    ...style,
  };

  // 递归查找当前路径对应的菜单节点链（从根到叶）
  const findChainByPath = (menus: MenuTreeNode[], targetPath: string): MenuTreeNode[] | null => {
    const traverse = (nodes: MenuTreeNode[], parents: MenuTreeNode[]): MenuTreeNode[] | null => {
      for (const node of nodes) {
        const newParents = [...parents, node];
        // 跳过隐藏或禁用的菜单在面包屑中展示（但如果路径正好匹配，仍允许显示）
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
      const userMenus = (initialState as any)?.currentUser?.menus as MenuTreeNode[] | undefined;
      const homeItem: BreadcrumbItemType = { title: '首页' };
      if (!userMenus || userMenus.length === 0) {
        // 没有菜单数据时，仅展示 首页 + 当前标题/路径尾部
        const lastSegment = location.pathname.split('/').filter(Boolean).pop();
        const currentTitle = (typeof title === 'string' && title) || lastSegment || '当前页面';
        return [homeItem, { title: currentTitle }];
      }

      const chain = findChainByPath(userMenus, location.pathname);
      if (!chain || chain.length === 0) {
        // 未在菜单中匹配到，降级为 首页 + 当前标题
        const lastSegment = location.pathname.split('/').filter(Boolean).pop();
        const currentTitle = (typeof title === 'string' && title) || lastSegment || '当前页面';
        return [homeItem, { title: currentTitle }];
      }

      // 过滤掉 welcome（首页）自身，避免重复
      const filtered = chain.filter((n) => n.path !== '/welcome');
      const items = filtered.map<BreadcrumbItemType>((n) => ({ title: n.title || n.name }));
      return [homeItem, ...items];
    } catch {
      return [];
    }
  }, [initialState, location.pathname, title]);

  const finalItems = breadcrumbItems.length > 0 ? breadcrumbItems : autoItems;

  const BreadcrumbView = showBreadcrumb && finalItems.length > 0 ? (
    <div style={{ marginBottom: 12 }}>
      <Breadcrumb items={finalItems} />
    </div>
  ) : null;

  if (title || extra || content) {
    return (
      <div style={defaultStyle} {...restProps}>
        {BreadcrumbView}
        <Card title={title} extra={extra} bordered={false}>
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
};

export default PageContainer;
