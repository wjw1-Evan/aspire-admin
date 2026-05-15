import { useIntl } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import React, { useRef } from 'react';
import ProjectView, { type ProjectViewRef } from '../task-management/components/ProjectView';

const ProjectManagement: React.FC = () => {
  const intl = useIntl();
  const projectViewRef = useRef<ProjectViewRef>(null);

  return (
    <PageContainer>
      <ProjectView ref={projectViewRef} />
    </PageContainer>
  );
};

export default ProjectManagement;
