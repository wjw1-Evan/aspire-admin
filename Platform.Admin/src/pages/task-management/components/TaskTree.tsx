import React, { useState, useEffect } from 'react';
import { Tree, Button, Space, Modal, message } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import {
  getTasksByProjectId,
  deleteTask,
  type TaskDto,
} from '@/services/task/api';
import TaskForm from './TaskForm';

interface TaskTreeProps {
  projectId: string;
}

const TaskTree: React.FC<TaskTreeProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await getTasksByProjectId(projectId);
      if (response.success && response.data) {
        setTasks(response.data);
        buildTreeData(response.data);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 递归构建树节点
  const buildTreeNode = (task: TaskDto): DataNode => {
    return {
      title: (
        <Space>
          {task.children && task.children.length > 0 ? (
            <FolderOutlined />
          ) : (
            <FileOutlined />
          )}
          <span>{task.taskName}</span>
          <span style={{ color: '#999', fontSize: '12px' }}>
            ({task.completionPercentage}%)
          </span>
        </Space>
      ),
      key: task.id || '',
      children: task.children && task.children.length > 0
        ? task.children.map((child) => buildTreeNode(child))
        : undefined,
    };
  };

  const buildTreeData = (taskList: TaskDto[]): void => {
    // 后端已经返回了树结构（只包含根任务，子任务在 children 中）
    // 直接使用，不需要过滤
    const rootTasks: DataNode[] = taskList.map((task) => buildTreeNode(task));

    setTreeData(rootTasks);
  };

  const handleDelete = async (taskId: string) => {
    Modal.confirm({
      title: '确认删除任务',
      content: '删除后任务将被标记为已删除，此操作不可逆。',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteTask(taskId);
          message.success('删除成功');
          loadTasks();
        } catch (error) {
          console.error('删除任务失败:', error);
        }
      },
    });
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTask(null);
            setFormVisible(true);
          }}
        >
          新建任务
        </Button>
      </Space>

      <Tree
        treeData={treeData}
        defaultExpandAll
        showLine
        loading={loading}
        onSelect={(selectedKeys, info) => {
          if (selectedKeys.length > 0) {
            // 递归查找任务（包括子任务）
            const findTask = (taskList: TaskDto[], id: string): TaskDto | null => {
              for (const task of taskList) {
                if (task.id === id) return task;
                if (task.children) {
                  const found = findTask(task.children, id);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const task = findTask(tasks, selectedKeys[0] as string);
            if (task) {
              setEditingTask(task);
              setFormVisible(true);
            }
          }
        }}
      />

      {formVisible && (
        <Modal
          title={editingTask ? '编辑任务' : '新建任务'}
          open={formVisible}
          onCancel={() => setFormVisible(false)}
          footer={null}
          width={600}
          destroyOnHidden
        >
          <TaskForm
            visible={formVisible}
            task={editingTask}
            projectId={projectId}
            onSuccess={() => {
              setFormVisible(false);
              loadTasks();
            }}
            onClose={() => setFormVisible(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default TaskTree;
