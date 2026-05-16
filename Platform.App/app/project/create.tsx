import React from 'react';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { projectService } from '../../services/projectService';
import { CreateProjectRequest } from '../../types/project';
import ProjectForm from '../../components/project/ProjectForm';

export default function CreateProjectScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleSave = async (data: CreateProjectRequest) => {
    const res = await projectService.createProject(data as any);
    if (res.success) {
      router.back();
    } else {
      throw new Error(res.message || t('projects.create_failed'));
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProjectForm onSave={handleSave as any} onCancel={() => router.back()} />
    </>
  );
}
