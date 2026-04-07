import React, { useState } from 'react';
import { ProTable, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Modal, Tag, Popconfirm } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
  addProjectMember,
  removeProjectMember,
  type ProjectMemberDto,
  type AddProjectMemberRequest,
} from '@/services/task/project';
import { getAllUsers } from '@/services/user/api';
import type { AppUser } from '@/services/user/api';
import ProjectMemberForm from './ProjectMemberForm';

interface ProjectMemberManagementProps {
  projectId: string;
  members: ProjectMemberDto[];
  onRefresh: () => void;
}

const ProjectMemberManagement: React.FC<ProjectMemberManagementProps> = ({
  projectId,
  members,
  onRefresh,
}) => {
  const message = useMessage();
  const { confirm } = useModal();
  const [formVisible, setFormVisible] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);

  React.useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getAllUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  const handleDelete = async (userId: string) => {
    confirm({
      title: '确认移除成员',
      content: '确定要移除该成员吗？',
      okText: '移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeProjectMember(projectId, userId);
          message.success('移除成功');
          onRefresh();
        } catch (error) {
          console.error('移除成员失败:', error);
        }
      },
    });
  };

  const columns: ProColumns<ProjectMemberDto>[] = [
    {
      title: '用户名',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: '邮箱',
      dataIndex: 'userEmail',
      key: 'userEmail',
    },
    {
      title: '角色',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (_: React.ReactNode, record: ProjectMemberDto) => <Tag>{record.roleName}</Tag>,
    },
    {
      title: '资源分配',
      dataIndex: 'allocation',
      key: 'allocation',
      render: (_: React.ReactNode, record: ProjectMemberDto) => `${record.allocation}%`,
    },
    {
      title: '操作',
      key: 'action',
      valueType: 'option',
      fixed: 'right' as ColumnType<ProjectMemberDto>['fixed'],
      width: 180,
      render: (_: any, record: ProjectMemberDto) => (
        <Popconfirm title={`确定移除成员「${record.userName}」？`} onConfirm={() => handleDelete(record.userId)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setFormVisible(true)}
        >
          添加成员
        </Button>
      </Space>

      <ProTable
        columns={columns}
        dataSource={members}
        rowKey="id"
        search={false}
        pagination={false}
        options={false}
        toolBarRender={false}
      />

      {formVisible && (
        <ProjectMemberForm
          projectId={projectId}
          existingMembers={members}
          availableUsers={users}
          onSuccess={() => {
            setFormVisible(false);
            onRefresh();
          }}
          onCancel={() => setFormVisible(false)}
        />
      )}
    </div>
  );
};

export default ProjectMemberManagement;
