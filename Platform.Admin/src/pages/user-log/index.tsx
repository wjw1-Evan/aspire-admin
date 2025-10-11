import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import React, { useRef } from 'react';
import { getUserActivityLogs } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';

const UserLog: React.FC = () => {
  const actionRef = useRef<ActionType>();

  /**
   * 获取操作类型标签颜色
   */
  const getActionTagColor = (action: string): string => {
    const colorMap: Record<string, string> = {
      login: 'green',
      logout: 'default',
      create_user: 'blue',
      update_user: 'cyan',
      delete_user: 'red',
      change_password: 'orange',
      update_profile: 'purple',
      refresh_token: 'geekblue',
      activate_user: 'green',
      deactivate_user: 'volcano',
      bulk_action: 'magenta',
      update_user_role: 'gold',
      view_profile: 'lime',
    };
    return colorMap[action] || 'default';
  };

  /**
   * 获取操作类型显示文本
   */
  const getActionText = (action: string): string => {
    const textMap: Record<string, string> = {
      login: '登录',
      logout: '登出',
      create_user: '创建用户',
      update_user: '更新用户',
      delete_user: '删除用户',
      change_password: '修改密码',
      update_profile: '更新个人信息',
      refresh_token: '刷新Token',
      activate_user: '启用用户',
      deactivate_user: '禁用用户',
      bulk_action: '批量操作',
      update_user_role: '更新用户角色',
      view_profile: '查看个人信息',
    };
    return textMap[action] || action;
  };

  const columns: ProColumns<UserActivityLog>[] = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      ellipsis: true,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Tag color={getActionTagColor(record.action)}>
          {getActionText(record.action)}
        </Tag>
      ),
      valueType: 'select',
      valueEnum: {
        login: { text: '登录' },
        logout: { text: '登出' },
        create_user: { text: '创建用户' },
        update_user: { text: '更新用户' },
        delete_user: { text: '删除用户' },
        change_password: { text: '修改密码' },
        update_profile: { text: '更新个人信息' },
        refresh_token: { text: '刷新Token' },
        activate_user: { text: '启用用户' },
        deactivate_user: { text: '禁用用户' },
        bulk_action: { text: '批量操作' },
        update_user_role: { text: '更新用户角色' },
        view_profile: { text: '查看个人信息' },
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      search: false,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
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
      width: 180,
      valueType: 'dateTime',
      search: false,
      sorter: true,
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
    </PageContainer>
  );
};

export default UserLog;

