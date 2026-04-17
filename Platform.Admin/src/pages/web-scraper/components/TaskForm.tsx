import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Select, message, Row, Col } from 'antd';
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
  filterPrompt?: string;
  enableFilter?: boolean;
  notifyOnMatch?: boolean;
}

interface TaskFormProps {
  visible: boolean;
  task: TaskFormValues | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const modeOptions = [
  { label: '仅当前页', value: 'singlePage' },
  { label: '深度优先', value: 'depthFirst' },
  { label: '广度优先', value: 'breadthFirst' },
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
        width: 800,
        destroyOnClose: true,
      }}
      submitter={{
        searchConfig: {
          submitText: task?.id ? '更新' : '创建',
          resetText: '取消',
        },
      }}
    >
      <Row gutter={16}>
        <Col span={24}>
          <ProFormText
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
            placeholder="请输入任务名称"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <ProFormText
            name="targetUrl"
            label="目标URL"
            rules={[
              { required: true, message: '请输入目标URL' },
              { type: 'url', message: '请输入有效的URL' },
            ]}
            placeholder="https://example.com"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <ProFormTextArea
            name="description"
            label="任务描述"
            placeholder="请输入任务描述（可选）"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="titleSelector"
            label="标题选择器"
            placeholder="CSS选择器，如 h1.title"
            tooltip="用于提取页面标题的CSS选择器，留空则使用<title>标签"
          />
        </Col>
        <Col span={12}>
          <ProFormText
            name="contentSelector"
            label="内容选择器"
            placeholder="CSS选择器，如 article.content"
            tooltip="用于提取页面主内容的CSS选择器，留空则使用<body>标签"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="抓取深度" name="crawlDepth">
            <InputNumber min={0} max={3} style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ color: '#999', marginTop: -16, marginBottom: 16, fontSize: 12 }}>
            0=仅当前页, 1=第一层, 2=第二层, 3=第三层
          </div>
        </Col>
        <Col span={8}>
          <ProFormDigit
            name="maxPagesPerLevel"
            label="每层最大页面数"
            min={1}
            max={500}
            fieldProps={{ precision: 0 }}
            tooltip="每层最多抓取的页面数量限制"
          />
        </Col>
        <Col span={8}>
          <ProFormSelect
            name="mode"
            label="抓取模式"
            options={modeOptions}
            initialValue="breadthFirst"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="urlFilterPattern"
            label="URL过滤正则"
            placeholder="如 ^https://example\.com/.*"
            tooltip="符合此正则表达式的URL才会被抓取（可选）"
          />
        </Col>
        <Col span={6}>
          <Form.Item label="跟随外部链接" name="followExternalLinks" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="URL去重" name="deduplicate" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <ProFormText
            name="scheduleCron"
            label="定时表达式"
            placeholder="0 */10 * * * *"
            tooltip={
              <div>
                <p>Cron表达式，用于定时执行</p>
                <p>格式：分 时 日 月 周（5位）或 分 时 日 月 周 秒（6位）</p>
                <p>常用快捷示例：</p>
                <ul style={{ margin: '8px 0', paddingLeft: 16 }}>
                  <li>每分钟：<code>* * * * *</code></li>
                  <li>每10分钟：<code>*/10 * * * *</code></li>
                  <li>每30分钟：<code>*/30 * * * *</code></li>
                  <li>每小时：<code>0 * * * *</code></li>
                  <li>每天凌晨：<code>0 0 * * *</code></li>
                  <li>每天上午10点：<code>0 10 * * *</code></li>
                  <li>每周一：<code>0 0 * * 1</code></li>
                  <li>每月1号：<code>0 0 1 * *</code></li>
                </ul>
              </div>
            }
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="启用AI筛选" name="enableFilter" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Col>
        <Col span={2}>
          <Form.Item label="匹配通知" name="notifyOnMatch" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Col>
        <Col span={16}>
          <ProFormTextArea
            name="filterPrompt"
            label="筛选提示词"
            placeholder="请输入筛选条件，如：筛选包含&quot;价格&quot;或&quot;报价&quot;的页面，提取相关的价格信息"
            tooltip="AI将根据此提示词分析抓取的页面内容，筛选出符合条件的结果"
            fieldProps={{
              rows: 2,
              showCount: true,
              maxLength: 500,
            }}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="启用任务" name="isEnabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Col>
      </Row>
    </ModalForm>
  );
};

export default TaskForm;
