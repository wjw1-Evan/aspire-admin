import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import React, { useRef, useState } from 'react';
import { getUserActivityLogs } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import LogDetailDrawer from './components/LogDetailDrawer';

const UserLog: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);

  const handleViewDetail = (record: UserActivityLog) => {
    setSelectedLog(record);
    setDetailDrawerOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDrawerOpen(false);
    setSelectedLog(null);
  };

  /**
   * 获取操作类型标签颜色
   */
  const getActionTagColor = (action: string): string => {
    const colorMap: Record<string, string> = {
      // 认证相关
      login: 'green',
      logout: 'default',
      refresh_token: 'geekblue',
      register: 'blue',
      
      // 用户相关
      view_profile: 'lime',
      update_profile: 'purple',
      change_password: 'orange',
      view_activity_logs: 'cyan',
      activate_user: 'green',
      deactivate_user: 'volcano',
      bulk_action: 'magenta',
      update_user_role: 'gold',
      create_user: 'blue',
      view_users: 'cyan',
      view_statistics: 'purple',
      view_user: 'cyan',
      update_user: 'blue',
      delete_user: 'red',
      
      // 角色相关
      view_roles: 'cyan',
      create_role: 'blue',
      update_role: 'orange',
      delete_role: 'red',
      
      // 菜单相关
      view_menus: 'cyan',
      create_menu: 'blue',
      update_menu: 'orange',
      delete_menu: 'red',
      
      // 通知相关
      view_notices: 'cyan',
      create_notice: 'blue',
      update_notice: 'orange',
      delete_notice: 'red',
      
      // 标签相关
      view_tags: 'cyan',
      create_tag: 'blue',
      update_tag: 'orange',
      delete_tag: 'red',
      
      // 规则相关
      view_rules: 'cyan',
      create_rule: 'blue',
      update_rule: 'orange',
      delete_rule: 'red',
      
      // 权限相关
      view_permissions: 'cyan',
      create_permission: 'blue',
      update_permission: 'orange',
      delete_permission: 'red',
      
      // 其他
      view_current_user: 'lime',
    };
    return colorMap[action] || 'default';
  };

  /**
   * 获取操作类型显示文本
   */
  const getActionText = (action: string): string => {
    const textMap: Record<string, string> = {
      // 认证相关
      login: '登录',
      logout: '登出',
      refresh_token: '刷新Token',
      register: '注册',
      
      // 用户相关
      view_profile: '查看个人信息',
      update_profile: '更新个人信息',
      change_password: '修改密码',
      view_activity_logs: '查看活动日志',
      activate_user: '启用用户',
      deactivate_user: '禁用用户',
      bulk_action: '批量操作',
      update_user_role: '更新用户角色',
      create_user: '创建用户',
      view_users: '查看用户列表',
      view_statistics: '查看统计',
      view_user: '查看用户',
      update_user: '更新用户',
      delete_user: '删除用户',
      
      // 角色相关
      view_roles: '查看角色',
      create_role: '创建角色',
      update_role: '更新角色',
      delete_role: '删除角色',
      role_operation: '角色操作',
      
      // 菜单相关
      view_menus: '查看菜单',
      create_menu: '创建菜单',
      update_menu: '更新菜单',
      delete_menu: '删除菜单',
      menu_operation: '菜单操作',
      
      // 通知相关
      view_notices: '查看通知',
      create_notice: '创建通知',
      update_notice: '更新通知',
      delete_notice: '删除通知',
      notice_operation: '通知操作',
      
      // 标签相关
      view_tags: '查看标签',
      create_tag: '创建标签',
      update_tag: '更新标签',
      delete_tag: '删除标签',
      tag_operation: '标签操作',
      
      // 规则相关
      view_rules: '查看规则',
      create_rule: '创建规则',
      update_rule: '更新规则',
      delete_rule: '删除规则',
      rule_operation: '规则操作',
      
      // 权限相关
      view_permissions: '查看权限',
      create_permission: '创建权限',
      update_permission: '更新权限',
      delete_permission: '删除权限',
      permission_operation: '权限操作',
      
      // 其他
      view_current_user: '查看当前用户',
      user_operation: '用户操作',
      
      // 默认HTTP操作
      get_request: 'GET请求',
      post_request: 'POST请求',
      put_request: 'PUT请求',
      delete_request: 'DELETE请求',
      patch_request: 'PATCH请求',
    };
    return textMap[action] || action;
  };

  const columns: ProColumns<UserActivityLog>[] = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      ellipsis: true,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => (
        <Tag color={getActionTagColor(record.action)}>
          {getActionText(record.action)}
        </Tag>
      ),
      valueType: 'select',
      valueEnum: {
        // 认证相关
        login: { text: '登录' },
        logout: { text: '登出' },
        refresh_token: { text: '刷新Token' },
        register: { text: '注册' },
        
        // 用户相关
        view_profile: { text: '查看个人信息' },
        update_profile: { text: '更新个人信息' },
        change_password: { text: '修改密码' },
        view_activity_logs: { text: '查看活动日志' },
        activate_user: { text: '启用用户' },
        deactivate_user: { text: '禁用用户' },
        bulk_action: { text: '批量操作' },
        update_user_role: { text: '更新用户角色' },
        create_user: { text: '创建用户' },
        view_users: { text: '查看用户列表' },
        view_statistics: { text: '查看统计' },
        view_user: { text: '查看用户' },
        update_user: { text: '更新用户' },
        delete_user: { text: '删除用户' },
        
        // 角色相关
        view_roles: { text: '查看角色' },
        create_role: { text: '创建角色' },
        update_role: { text: '更新角色' },
        delete_role: { text: '删除角色' },
        
        // 菜单相关
        view_menus: { text: '查看菜单' },
        create_menu: { text: '创建菜单' },
        update_menu: { text: '更新菜单' },
        delete_menu: { text: '删除菜单' },
        
        // 通知相关
        view_notices: { text: '查看通知' },
        create_notice: { text: '创建通知' },
        update_notice: { text: '更新通知' },
        delete_notice: { text: '删除通知' },
        
        // 标签相关
        view_tags: { text: '查看标签' },
        create_tag: { text: '创建标签' },
        update_tag: { text: '更新标签' },
        delete_tag: { text: '删除标签' },
        
        // 规则相关
        view_rules: { text: '查看规则' },
        create_rule: { text: '创建规则' },
        update_rule: { text: '更新规则' },
        delete_rule: { text: '删除规则' },
        
        // 权限相关
        view_permissions: { text: '查看权限' },
        create_permission: { text: '创建权限' },
        update_permission: { text: '更新权限' },
        delete_permission: { text: '删除权限' },
        
        // 其他
        view_current_user: { text: '查看当前用户' },
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      search: false,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      search: false,
      ellipsis: true,
    },
    {
      title: '用户代理',
      dataIndex: 'userAgent',
      key: 'userAgent',
      search: false,
      ellipsis: true,
      hideInTable: true,
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
    {
      title: '操作',
      key: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="view"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: '用户操作日志',
        subTitle: '系统用户活动记录和审计日志',
      }}
    >
      <ProTable<UserActivityLog>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          optionRender: (searchConfig, formProps, dom) => {
            const reversed = [...dom];
            reversed.reverse();
            return reversed;
          },
        }}
        request={async (params, sort) => {
          const { current = 1, pageSize = 20, action } = params;
          
          try {
            const response = await getUserActivityLogs({
              page: current,
              pageSize,
              action,
            });

            if (response.success && response.data) {
              // 后端返回的数据结构：{ data: { data: [...], total: xxx, ... } }
              const result = response.data as any;
              return {
                data: result.data || [],
                total: result.total || 0,
                success: true,
              };
            }

            return {
              data: [],
              total: 0,
              success: false,
            };
          } catch (error) {
            console.error('Failed to load user activity logs:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
      
      <LogDetailDrawer
        open={detailDrawerOpen}
        log={selectedLog}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default UserLog;

