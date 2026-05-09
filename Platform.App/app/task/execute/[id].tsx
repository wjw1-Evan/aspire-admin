import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { taskService } from '../../../services/taskService';
import { TaskDto, TaskExecutionResult } from '../../../types/task';
import TaskExecutionForm from '../../../components/task/TaskExecutionForm';
import LoadingView from '../../../components/ui/LoadingView';

export default function ExecuteTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await taskService.getTaskById(id);
      if (res.success && res.data) {
        setTask(res.data);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleProgressUpdate = async (percentage: number, message?: string) => {
    setSaving(true);
    try {
      await taskService.executeTask({ taskId: id, completionPercentage: percentage, message });
      Toast.show({ type: 'success', text1: '进度更新成功', position: 'top', visibilityTime: 2000 });
      router.back();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: '更新失败', text2: err?.message, position: 'top' });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (
    result: TaskExecutionResult,
    remarks?: string,
    errorMessage?: string
  ) => {
    setSaving(true);
    try {
      await taskService.completeTask({
        taskId: id,
        executionResult: result,
        remarks,
        errorMessage,
      });
      Toast.show({ type: 'success', text1: '任务已完成', position: 'top', visibilityTime: 2000 });
      router.back();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: '操作失败', text2: err?.message, position: 'top' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !task) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TaskExecutionForm
        taskName={task.taskName}
        currentProgress={task.completionPercentage}
        onProgressUpdate={handleProgressUpdate}
        onComplete={handleComplete}
        onCancel={() => router.back()}
        saving={saving}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
