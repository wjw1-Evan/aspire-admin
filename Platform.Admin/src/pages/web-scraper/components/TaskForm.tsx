import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Select, message } from 'antd';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { ApiResponse } from '@/types';

interface TaskFormValues {
  id?: string;
  name?: string;
  targetUrl?: string;
  description?: string;
  titleSelector?: string;
  contentSelector?: string;
  crawlDepth?: number;
  maxPagesPerLevel?: number;
  urlFilterPattern?: string;
  followExternalLinks?: boolean;
  deduplicate?: boolean;
  mode?: 'SinglePage' | 'DepthFirst' | 'BreadthFirst';
  scheduleCron?: string;
  isEnabled?: boolean;
}

interface TaskFormProps {
  visible: boolean;
  task: TaskFormValues | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const modeOptions = [
  { label: '仅当前页', value: 'singlepage' },
  { label: '深度优先', value: 'depthfirst' },
  { label: '广度优先', value: 'breadthfirst' },
];

const api = {
  create: (data: TaskFormValues) =>
    request<ApiResponse<any>>('/apiservice/api/web-scraper/tasks', { method: 'POST', data }),
  update: (id: string, data: TaskFormValues) =>
    request<ApiResponse<any>>(`/apiservice/api/web-scraper/tasks/${id}`, { method: 'PUT', data }),
};

const TaskForm: React.FC<TaskFormProps> = ({ visible, task, onCancel, onSuccess }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && task) {
      form.setFieldsValue(task);
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({
        crawlDepth: 0,
        maxPagesPerLevel: 100,
        followExternalLinks: false,
        deduplicate: true,
        isEnabled: true,
        mode: 'breadthfirst',
      });
    }
  }, [visible, task, form]);

  const handleFinish = async (values: TaskFormValues) => {
    try {
      if (task?.id) {
        await api.update(task.id, values);
      } else {
        await api.create(values);
      }
      onSuccess();
    } catch {
      message.error(task?.id ? '更新失败' : '创建失败');
    }
    return true;
  };

  return (
    <ModalForm
      title={task?.id ? '编辑任务' : '新建任务'}
      open={visible}
      form={form}
      onFinish={handleFinish}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      modalProps={{
        width: 600,
        destroyOnClose: true,
      }}
      submitter={{
        searchConfig: {
          submitText: task?.id ? '更新' : '创建',
          resetText: '取消',
        },
      }}
    >
      <ProFormText
        name="name"
        label="任务名称"
        rules={[{ required: true, message: '请输入任务名称' }]}
        placeholder="请输入任务名称"
      />

      <ProFormText
        name="targetUrl"
        label="目标URL"
        rules={[
          { required: true, message: '请输入目标URL' },
          { type: 'url', message: '请输入有效的URL' },
        ]}
        placeholder="https://example.com"
      />

      <ProFormTextArea
        name="description"
        label="任务描述"
        placeholder="请输入任务描述（可选）"
      />

      <ProFormText
        name="titleSelector"
        label="标题选择器"
        placeholder="CSS选择器，如 h1.title"
        tooltip="用于提取页面标题的CSS选择器，留空则使用<title>标签"
      />

      <ProFormText
        name="contentSelector"
        label="内容选择器"
        placeholder="CSS选择器，如 article.content"
        tooltip="用于提取页面主内容的CSS选择器，留空则使用<body>标签"
      />

      <Form.Item label="抓取深度" name="crawlDepth">
        <InputNumber min={0} max={3} style={{ width: '100%' }} />
      </Form.Item>
      <div style={{ color: '#999', marginTop: -16, marginBottom: 16 }}>
        0=仅当前页, 1=第一层, 2=第二层, 3=第三层
      </div>

      <ProFormDigit
        name="maxPagesPerLevel"
        label="每层最大页面数"
        min={1}
        max={500}
        fieldProps={{ precision: 0 }}
        tooltip="每层最多抓取的页面数量限制"
      />

      <ProFormSelect
        name="mode"
        label="抓取模式"
        options={modeOptions}
        initialValue="breadthfirst"
      />

      <ProFormText
        name="urlFilterPattern"
        label="URL过滤正则"
        placeholder="如 ^https://example\.com/.*"
        tooltip="符合此正则表达式的URL才会被抓取（可选）"
      />

      <Form.Item label="跟随外部链接" name="followExternalLinks" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item label="URL去重" name="deduplicate" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>

      <ProFormText
        name="scheduleCron"
        label="定时表达式"
        placeholder="0 0 * * *"
        tooltip={
          <div>
            <p>Cron表达式，用于定时执行</p>
            <p>格式：分 时 日 月 周</p>
            <p>常用示例：</p>
            <ul style={{ margin: '8px 0', paddingLeft: 16 }}>
              <li>每分钟执行：<code>* * * * *</code></li>
              <li>每小时执行：<code>0 * * * *</code></li>
              <li>每天凌晨执行：<code>0 0 * * *</code></li>
              <li>每天上午10点：<code>0 10 * * *</code></li>
              <li>每周一执行：<code>0 0 * * 1</code></li>
              <li>每月1号执行：<code>0 0 1 * *</code></li>
            </ul>
          </div>
        }
      />

      <Form.Item label="启用任务" name="isEnabled" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </ModalForm>
  );
};

export default TaskForm;
