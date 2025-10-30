/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const accessValue = (currentUser as any)?.access as 'admin' | 'user' | 'guest' | undefined;

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
   * 检查是否有指定角色
   */
  const hasRole = (roleName: string): boolean => {
    if (!currentUser || !currentUser.roles) {
      return false;
    }
    return currentUser.roles.includes(roleName);
  };

  return {
    // 统一的简化守卫（推荐在页面中使用）
    adminAccess: accessValue === 'admin',
    userAccess: accessValue === 'admin' || accessValue === 'user',
    guestAccess: !currentUser,

    // 兼容保留（如旧代码使用 canAdmin）
    canAdmin: hasRole('admin') || hasRole('管理员'),
    canAccessMenu,
    canAccessPath,
    hasRole,
  };
}
