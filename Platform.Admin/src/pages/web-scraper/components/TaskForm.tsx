import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Switch, message, Row, Col } from 'antd';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit } from '@ant-design/pro-components';
import { request, getIntl } from '@umijs/max';
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
  { label: 'pages.web-scraper.mode.single', value: 'singlePage' },
  { label: 'pages.web-scraper.mode.depth', value: 'depthFirst' },
  { label: 'pages.web-scraper.mode.breadth', value: 'breadthFirst' },
];

const api = {
  create: (data: TaskFormValues) =>
    request<ApiResponse<any>>('/apiservice/api/web-scraper/tasks', { method: 'POST', data }),
  update: (id: string, data: TaskFormValues) =>
    request<ApiResponse<any>>(`/apiservice/api/web-scraper/tasks/${id}`, { method: 'PUT', data }),
};

const TaskForm: React.FC<TaskFormProps> = ({ visible, task, onCancel, onSuccess }) => {
  const intl = getIntl();
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
        enableFilter: false,
        notifyOnMatch: true,
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
      message.error(task?.id ? intl.formatMessage({ id: 'pages.web-scraper.message.updateFailed', defaultMessage: '更新失败' }) : intl.formatMessage({ id: 'pages.web-scraper.message.createFailed', defaultMessage: '创建失败' }));
    }
    return true;
  };

  return (
    <ModalForm
      title={task?.id ? intl.formatMessage({ id: 'pages.web-scraper.editTask', defaultMessage: '编辑任务' }) : intl.formatMessage({ id: 'pages.web-scraper.createTask', defaultMessage: '新建任务' })}
      open={visible}
      form={form}
      onFinish={handleFinish}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      modalProps={{
        width: 700,
        destroyOnClose: true,
      }}
      submitter={{
        searchConfig: {
          submitText: task?.id ? intl.formatMessage({ id: 'pages.web-scraper.update', defaultMessage: '更新' }) : intl.formatMessage({ id: 'pages.web-scraper.submit', defaultMessage: '创建' }),
          resetText: intl.formatMessage({ id: 'pages.web-scraper.cancel', defaultMessage: '取消' }),
        },
      }}
    >
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.web-scraper.taskName', defaultMessage: '任务名称' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.web-scraper.taskNameRequired', defaultMessage: '请输入任务名称' }) }]}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.taskNamePlaceholder', defaultMessage: '请输入任务名称' })}
      />

      <ProFormText
        name="targetUrl"
        label={intl.formatMessage({ id: 'pages.web-scraper.targetUrl', defaultMessage: '目标URL' })}
        rules={[
          { required: true, message: intl.formatMessage({ id: 'pages.web-scraper.targetUrlRequired', defaultMessage: '请输入目标URL' }) },
          { type: 'url', message: intl.formatMessage({ id: 'pages.web-scraper.targetUrlInvalid', defaultMessage: '请输入有效的URL' }) },
        ]}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.targetUrlPlaceholder', defaultMessage: 'https://example.com' })}
      />

      <ProFormTextArea
        name="description"
        label={intl.formatMessage({ id: 'pages.web-scraper.description', defaultMessage: '任务描述' })}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.descriptionPlaceholder', defaultMessage: '请输入任务描述（可选）' })}
      />

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="titleSelector"
            label={intl.formatMessage({ id: 'pages.web-scraper.titleSelector', defaultMessage: '标题选择器' })}
            placeholder={intl.formatMessage({ id: 'pages.web-scraper.titleSelectorPlaceholder', defaultMessage: 'CSS选择器，如 h1.title' })}
            tooltip={intl.formatMessage({ id: 'pages.web-scraper.titleSelectorTooltip', defaultMessage: '用于提取页面标题的CSS选择器，留空则使用<title>标签' })}
          />
        </Col>
        <Col span={12}>
          <ProFormText
            name="contentSelector"
            label={intl.formatMessage({ id: 'pages.web-scraper.contentSelector', defaultMessage: '内容选择器' })}
            placeholder={intl.formatMessage({ id: 'pages.web-scraper.contentSelectorPlaceholder', defaultMessage: 'CSS选择器，如 article.content' })}
            tooltip={intl.formatMessage({ id: 'pages.web-scraper.contentSelectorTooltip', defaultMessage: '用于提取页面主内容的CSS选择器，留空则使用<body>标签' })}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.crawlDepth', defaultMessage: '抓取深度' })} name="crawlDepth">
            <InputNumber min={0} max={3} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <ProFormDigit
            name="maxPagesPerLevel"
            label={intl.formatMessage({ id: 'pages.web-scraper.maxPagesPerLevel', defaultMessage: '每层最大页面数' })}
            min={1}
            max={500}
            fieldProps={{ precision: 0 }}
          />
        </Col>
        <Col span={8}>
          <ProFormSelect
            name="mode"
            label={intl.formatMessage({ id: 'pages.web-scraper.crawlMode', defaultMessage: '抓取模式' })}
            options={modeOptions.map(opt => ({ label: intl.formatMessage({ id: opt.label, defaultMessage: opt.label }), value: opt.value }))}
            initialValue="breadthFirst"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="urlFilterPattern"
            label={intl.formatMessage({ id: 'pages.web-scraper.urlFilter', defaultMessage: 'URL过滤正则' })}
            placeholder={intl.formatMessage({ id: 'pages.web-scraper.urlFilterPlaceholder', defaultMessage: '如 ^https://example\\.com/.*' })}
          />
        </Col>
        <Col span={6}>
          <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.followExternalLinks', defaultMessage: '跟随外链' })} name="followExternalLinks" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.deduplicate', defaultMessage: 'URL去重' })} name="deduplicate" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Col>
      </Row>

      <ProFormText
        name="scheduleCron"
        label={intl.formatMessage({ id: 'pages.web-scraper.scheduleCron', defaultMessage: '定时表达式' })}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.scheduleCronPlaceholder', defaultMessage: '0 */10 * * * *' })}
        tooltip={
          <div>
            <p>常用示例：</p>
            <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
              <li>每10分钟：<code>*/10 * * * *</code></li>
              <li>每小时：<code>0 * * * *</code></li>
              <li>每天凌晨：<code>0 0 * * *</code></li>
              <li>每周一：<code>0 0 * * 1</code></li>
            </ul>
          </div>
        }
      />

       <Row gutter={16}>
         <Col span={6}>
           <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.enableFilter' })} name="enableFilter" valuePropName="checked">
             <Switch />
           </Form.Item>
         </Col>
         <Col span={6}>
           <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.matchNotification' })} name="notifyOnMatch" valuePropName="checked">
             <Switch defaultChecked />
           </Form.Item>
         </Col>
       </Row>

      <ProFormTextArea
        name="filterPrompt"
        label={intl.formatMessage({ id: 'pages.web-scraper.filterPrompt', defaultMessage: '筛选提示词' })}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.filterPromptPlaceholder', defaultMessage: '如：筛选包含"价格"或"报价"的页面' })}
        fieldProps={{
          rows: 2,
          showCount: true,
          maxLength: 500,
        }}
      />

      <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.enableTask', defaultMessage: '启用任务' })} name="isEnabled" valuePropName="checked">
        <Switch defaultChecked />
      </Form.Item>
    </ModalForm>
  );
};

export default TaskForm;