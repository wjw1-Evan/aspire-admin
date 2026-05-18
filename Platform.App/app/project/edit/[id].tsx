import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { projectService } from '../../../services/projectService';
import { ProjectDto, UpdateProjectRequest } from '../../../types/project';
import ProjectForm from '../../../components/project/ProjectForm';
import LoadingView from '../../../components/ui/LoadingView';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await projectService.getProjectById(id);
      if (res.success && res.data) {
        setProject(res.data);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSave = async (data: UpdateProjectRequest) => {
    await projectService.updateProject(id, data);
    router.back();
  };

  if (loading) return <LoadingView />;
  if (!project) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProjectForm
        initialValues={project}
        onSave={handleSave}
        onCancel={() => router.back()}
      />
    </>
  );
}
