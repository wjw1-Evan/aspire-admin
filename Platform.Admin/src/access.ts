/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  
  /**
   * 检查用户是否可以访问指定菜单
   */
  const canAccessMenu = (menuId: string): boolean => {
    if (!currentUser || !currentUser.menus) {
      return false;
    }
    
    // 递归查找菜单
    const findMenu = (menus: API.MenuTreeNode[]): boolean => {
      for (const menu of menus) {
        if (menu.id === menuId) {
          return true;
        }
        if (menu.children && menu.children.length > 0) {
          if (findMenu(menu.children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    return findMenu(currentUser.menus);
  };
  
  /**
   * 检查用户是否可以访问指定路径
   */
  const canAccessPath = (path: string): boolean => {
    if (!currentUser || !currentUser.menus) {
      return false;
    }
    
    // 递归查找路径
    const findPath = (menus: API.MenuTreeNode[]): boolean => {
      for (const menu of menus) {
        if (menu.path === path) {
          return true;
        }
        if (menu.children && menu.children.length > 0) {
          if (findPath(menu.children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    return findPath(currentUser.menus);
  };
  
  /**
   * 检查是否有指定权限
   */
  const hasPermission = (permissionCode: string): boolean => {
    if (!currentUser || !currentUser.permissions) {
      return false;
    }
    return currentUser.permissions.includes(permissionCode);
  };
  
  /**
   * 检查是否有资源的指定操作权限
   */
  const can = (resource: string, action: string): boolean => {
    return hasPermission(`${resource}:${action}`);
  };
  
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    canAccessMenu,
    canAccessPath,
    hasPermission,
    can,
    
    // 用户权限
    canCreateUser: can('user', 'create'),
    canReadUser: can('user', 'read'),
    canUpdateUser: can('user', 'update'),
    canDeleteUser: can('user', 'delete'),
    
    // 角色权限
    canCreateRole: can('role', 'create'),
    canReadRole: can('role', 'read'),
    canUpdateRole: can('role', 'update'),
    canDeleteRole: can('role', 'delete'),
    
    // 菜单权限
    canCreateMenu: can('menu', 'create'),
    canReadMenu: can('menu', 'read'),
    canUpdateMenu: can('menu', 'update'),
    canDeleteMenu: can('menu', 'delete'),
    
    // 公告权限
    canCreateNotice: can('notice', 'create'),
    canReadNotice: can('notice', 'read'),
    canUpdateNotice: can('notice', 'update'),
    canDeleteNotice: can('notice', 'delete'),
    
    // 标签权限
    canCreateTag: can('tag', 'create'),
    canReadTag: can('tag', 'read'),
    canUpdateTag: can('tag', 'update'),
    canDeleteTag: can('tag', 'delete'),
    
    // 权限管理权限
    canCreatePermission: can('permission', 'create'),
    canReadPermission: can('permission', 'read'),
    canUpdatePermission: can('permission', 'update'),
    canDeletePermission: can('permission', 'delete'),
    
    // 活动日志权限
    canReadActivityLog: can('activity-log', 'read'),
  };
}
