import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { taskService } from '../../../services/taskService';
import { projectService } from '../../../services/projectService';
import { TaskDto, UpdateTaskRequest } from '../../../types/task';
import TaskForm from '../../../components/task/TaskForm';
import LoadingView from '../../../components/ui/LoadingView';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [taskRes, projectRes] = await Promise.all([
        taskService.getTaskById(id),
        projectService.getProjectList({ page: 1, pageSize: 100 }),
      ]);
      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data);
      }
      if (projectRes.success && projectRes.data) {
        setProjects((projectRes.data.queryable || []).map(p => ({ id: p.id, name: p.name })));
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSave = async (data: UpdateTaskRequest) => {
    await taskService.updateTask(data as any);
    router.back();
  };

  if (loading) return <LoadingView />;
  if (!task) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TaskForm
        initialValues={task}
        projects={projects}
        onSave={handleSave as any}
        onCancel={() => router.back()}
      />
    </>
  );
}
