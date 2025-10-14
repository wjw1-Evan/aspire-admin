import { useState, useEffect } from 'react';
import { getAllRoles } from '@/services/role/api';
import type { Role } from '@/services/role/api';

/**
 * 角色映射 Hook
 * 
 * 获取角色列表并构建 ID 到名称的映射
 * 
 * @example
 * ```tsx
 * const { roleMap, roleList, loading } = useRoleMap();
 * 
 * const roleName = roleMap[roleId]; // 根据ID获取名称
 * ```
 */
export function useRoleMap() {
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [roleList, setRoleList] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const response = await getAllRoles();
        if (response.success && response.data) {
          const roles = response.data.roles;
          setRoleList(roles);
          
          // 构建 ID -> Name 映射
          const map: Record<string, string> = {};
          roles.forEach((role) => {
            if (role.id) {
              map[role.id] = role.name;
            }
          });
          setRoleMap(map);
        }
      } catch (error) {
        console.error('加载角色列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return {
    roleMap,
    roleList,
    loading,
  };
}





