import React from 'react';
import { ProTable, ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import {
  type ProjectMemberDto,
} from '@/services/task/project';

interface ProjectMemberManagementProps {
  projectId: string;
  members: ProjectMemberDto[];
  onRefresh: () => void;
}

const ProjectMemberManagement: React.FC<ProjectMemberManagementProps> = ({
  projectId,
  members,
}) => {
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
  ];

  return (
    <div>
      <ProTable
        columns={columns}
        dataSource={members}
        rowKey="id"
        search={false}
        pagination={false}
        options={false}
        toolBarRender={false}
      />
    </div>
  );
};

export default ProjectMemberManagement;
