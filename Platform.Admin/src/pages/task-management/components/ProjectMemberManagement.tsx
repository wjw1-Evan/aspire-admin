import React, { useState } from 'react';
import { Table, Button, Space, Modal, Tag } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
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
        setUsers(response.data.users || []);
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

  const columns: ColumnsType<ProjectMemberDto> = [
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
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: '资源分配',
      dataIndex: 'allocation',
      key: 'allocation',
      render: (allocation: number) => `${allocation}%`,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as ColumnType<ProjectMemberDto>['fixed'],
      width: 150,
      render: (_: any, record: ProjectMemberDto) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.userId)}
        >
          移除
        </Button>
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

      <Table
        columns={columns}
        dataSource={members}
        rowKey="id"
        pagination={false}
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
