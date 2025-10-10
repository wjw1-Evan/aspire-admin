/**
 * 菜单项
 */
export interface MenuItem {
  id?: string;
  name: string;
  path: string;
  component?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  hideInMenu: boolean;
  parentId?: string;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 菜单树节点
 */
export interface MenuTreeNode extends MenuItem {
  children: MenuTreeNode[];
}

/**
 * 创建菜单请求
 */
export interface CreateMenuRequest {
  name: string;
  path: string;
  component?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  hideInMenu: boolean;
  parentId?: string;
  permissions: string[];
}

/**
 * 更新菜单请求
 */
export interface UpdateMenuRequest {
  name?: string;
  path?: string;
  component?: string;
  icon?: string;
  sortOrder?: number;
  isEnabled?: boolean;
  isExternal?: boolean;
  openInNewTab?: boolean;
  hideInMenu?: boolean;
  parentId?: string;
  permissions?: string[];
}

/**
 * 菜单排序请求
 */
export interface ReorderMenusRequest {
  menuIds: string[];
  parentId?: string;
}

