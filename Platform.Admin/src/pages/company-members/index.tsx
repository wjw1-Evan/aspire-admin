import { ProTable } from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-layout';
import { Tag, Button, Space, App, Popconfirm, Modal, Select, Switch } from 'antd';
import React, { useRef, useState } from 'react';
import { request } from '@umijs/max';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { UserOutlined, CrownOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

const { Option } = Select;

/**
 * v3.1: 企业成员管理页面（管理员）
 */
const CompanyMembers: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<API.Role[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // 加载角色列表
  React.useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await request<API.ApiResponse<API.Role[]>>('/api/role', {
        method: 'GET',
      });
      if (response.success && response.data) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
    }
  };

  // 更新成员角色
  const handleUpdateRoles = (member: any) => {
    setSelectedMember(member);
    modal.confirm({
      title: `更新 ${member.username} 的角色`,
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>选择角色：</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="请选择角色"
            defaultValue={member.roleIds || []}
            onChange={(value) => {
              setSelectedMember({ ...member, roleIds: value });
            }}
          >
            {roles.map(role => (
              <Option key={role.id} value={role.id}>
                {role.name}
              </Option>
            ))}
          </Select>
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await request<API.ApiResponse<boolean>>(
            `/api/company/${member.companyId}/members/${member.userId}/roles`,
            {
              method: 'PUT',
              data: {
                roleIds: selectedMember.roleIds || [],
              },
            }
          );

          if (response.success) {
            message.success('角色更新成功');
            actionRef.current?.reload();
          } else {
            message.error(response.errorMessage || '更新失败');
          }
        } catch (error: any) {
          message.error(error.message || '更新失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 设置/取消管理员权限
  const handleToggleAdmin = async (member: any) => {
    const action = member.isAdmin ? '取消管理员权限' : '设置为管理员';
    modal.confirm({
      title: `确定${action}吗？`,
      content: `${action}后，该成员将${member.isAdmin ? '失去' : '获得'}企业管理员权限。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await request<API.ApiResponse<boolean>>(
            `/api/company/${member.companyId}/members/${member.userId}/admin`,
            {
              method: 'PUT',
              data: {
                isAdmin: !member.isAdmin,
              },
            }
          );

          if (response.success) {
            message.success(`${action}成功`);
            actionRef.current?.reload();
          } else {
            message.error(response.errorMessage || '操作失败');
          }
        } catch (error: any) {
          message.error(error.message || '操作失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 移除成员
  const handleRemoveMember = async (member: any) => {
    modal.confirm({
      title: `确定移除成员 ${member.username} 吗？`,
      content: '移除后，该成员将无法访问企业数据，但可以重新申请加入。',
      okText: '确定移除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await request<API.ApiResponse<boolean>>(
            `/api/company/${member.companyId}/members/${member.userId}`,
            {
              method: 'DELETE',
            }
          );

          if (response.success) {
            message.success('成员已移除');
            actionRef.current?.reload();
          } else {
            message.error(response.errorMessage || '移除失败');
          }
        } catch (error: any) {
          message.error(error.message || '移除失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const columns: ProColumns<any>[] = [
    {
      title: '成员',
      dataIndex: 'username',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <strong>{record.username}</strong>
            {record.isAdmin && (
              <CrownOutlined style={{ marginLeft: 8, color: '#faad14' }} />
            )}
          </div>
          {record.email && (
            <div style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>
              {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleNames',
      width: 200,
      render: (_, record) => (
        <Space wrap>
          {record.roleNames?.map((roleName: string, index: number) => (
            <Tag key={index} color="blue">
              {roleName}
            </Tag>
          )) || <span style={{ color: '#999' }}>无角色</span>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        active: {
          text: '正常',
          status: 'Success',
        },
        pending: {
          text: '待激活',
          status: 'Processing',
        },
        inactive: {
          text: '已停用',
          status: 'Error',
        },
      },
    },
    {
      title: '管理员',
      dataIndex: 'isAdmin',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={record.isAdmin}
          onChange={() => handleToggleAdmin(record)}
          loading={loading}
        />
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'joinedAt',
      width: 180,
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleUpdateRoles(record)}
            icon={<EditOutlined />}
          >
            编辑角色
          </Button>
          <Popconfirm
            title="确定移除该成员吗？"
            onConfirm={() => handleRemoveMember(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '企业成员管理',
        subTitle: '管理企业成员的角色和权限',
      }}
    >
      <ProTable<any>
        columns={columns}
        actionRef={actionRef}
        request={async (params, sort) => {
          try {
            // 获取当前企业ID（这里需要从某个地方获取）
            const currentUser = await request<API.ApiResponse<API.CurrentUser>>('/api/currentUser', {
              method: 'GET',
            });
            
            if (!currentUser.success || !currentUser.data?.currentCompanyId) {
              return {
                data: [],
                success: false,
              };
            }

            const response = await request<API.ApiResponse<any[]>>(
              `/api/company/${currentUser.data.currentCompanyId}/members`,
              {
                method: 'GET',
              }
            );

            if (response.success && response.data) {
              return {
                data: response.data,
                success: true,
                total: response.data.length,
              };
            }

            return {
              data: [],
              success: false,
            };
          } catch (error) {
            return {
              data: [],
              success: false,
            };
          }
        }}
        rowKey="userId"
        search={false}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        dateFormatter="string"
        toolBarRender={() => [
          <Button
            key="search"
            type="primary"
            onClick={() => {
              window.location.href = '/company/search';
            }}
          >
            邀请新成员
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

export default CompanyMembers;