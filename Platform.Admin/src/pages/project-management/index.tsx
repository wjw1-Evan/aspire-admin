import { useIntl } from '@umijs/max';
import React, { useRef } from 'react';
import ProjectView, { type ProjectViewRef } from '../task-management/components/ProjectView';
import { PageContainer } from '@ant-design/pro-components';


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
