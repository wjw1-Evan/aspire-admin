import React, { useRef } from 'react';
import { PageContainer } from '@/components';
import { useIntl } from '@umijs/max';
import { ProjectOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Space, Button } from 'antd';
import ProjectView, { type ProjectViewRef } from '../task-management/components/ProjectView';

const ProjectManagement: React.FC = () => {
  const intl = useIntl();
  const projectViewRef = useRef<ProjectViewRef>(null);

  return (
    <PageContainer
      title={
        <Space>
          <ProjectOutlined />
          {intl.formatMessage({ id: 'pages.projectManagement.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              projectViewRef.current?.reload();
              projectViewRef.current?.refreshStatistics();
            }}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              projectViewRef.current?.handleCreate();
            }}
          >
            {intl.formatMessage({ id: 'pages.projectManagement.createProject' })}
          </Button>
        </Space>
      }
    >
      <ProjectView ref={projectViewRef} />
    </PageContainer>
  );
};

export default ProjectManagement;
