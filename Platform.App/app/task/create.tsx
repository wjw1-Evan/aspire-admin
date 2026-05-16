import React from 'react';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { CreateTaskRequest } from '../../types/task';
import TaskForm from '../../components/task/TaskForm';

export default function CreateTaskScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    const loadProjects = async () => {
      const res = await projectService.getProjectList({ page: 1, pageSize: 100 });
      if (res.success && res.data) {
        setProjects((res.data.queryable || []).map(p => ({ id: p.id, name: p.name })));
      }
    };
    loadProjects();
  }, []);

  const handleSave = async (data: CreateTaskRequest) => {
    const res = await taskService.createTask(data as any);
    if (res.success) {
      router.back();
    } else {
      throw new Error(res.message || t('tasks.create_failed'));
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TaskForm projects={projects} onSave={handleSave as any} onCancel={() => router.back()} />
    </>
  );
}
