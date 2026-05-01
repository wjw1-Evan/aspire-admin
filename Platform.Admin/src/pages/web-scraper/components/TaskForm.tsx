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
      message.error(task?.id ? intl.formatMessage({ id: 'pages.web-scraper.message.updateFailed' }) : intl.formatMessage({ id: 'pages.web-scraper.message.createFailed' }));
    }
    return true;
  };

  return (
    <ModalForm
      title={task?.id ? intl.formatMessage({ id: 'pages.web-scraper.editTask' }) : intl.formatMessage({ id: 'pages.web-scraper.createTask' })}
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
          submitText: task?.id ? intl.formatMessage({ id: 'pages.web-scraper.update' }) : intl.formatMessage({ id: 'pages.web-scraper.submit' }),
          resetText: intl.formatMessage({ id: 'pages.web-scraper.cancel' }),
        },
      }}
    >
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.web-scraper.taskName' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.web-scraper.taskNameRequired' }) }]}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.taskNamePlaceholder' })}
      />

      <ProFormText
        name="targetUrl"
        label={intl.formatMessage({ id: 'pages.web-scraper.targetUrl' })}
        rules={[
          { required: true, message: intl.formatMessage({ id: 'pages.web-scraper.targetUrlRequired' }) },
          { type: 'url', message: intl.formatMessage({ id: 'pages.web-scraper.targetUrlInvalid' }) },
        ]}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.targetUrlPlaceholder' })}
      />

      <ProFormTextArea
        name="description"
        label={intl.formatMessage({ id: 'pages.web-scraper.description' })}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.descriptionPlaceholder' })}
      />

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="titleSelector"
            label={intl.formatMessage({ id: 'pages.web-scraper.titleSelector' })}
            placeholder={intl.formatMessage({ id: 'pages.web-scraper.titleSelectorPlaceholder' })}
            tooltip={intl.formatMessage({ id: 'pages.web-scraper.titleSelectorTooltip' })}
          />
        </Col>
        <Col span={12}>
          <ProFormText
            name="contentSelector"
            label={intl.formatMessage({ id: 'pages.web-scraper.contentSelector' })}
            placeholder={intl.formatMessage({ id: 'pages.web-scraper.contentSelectorPlaceholder' })}
            tooltip={intl.formatMessage({ id: 'pages.web-scraper.contentSelectorTooltip' })}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.crawlDepth' })} name="crawlDepth">
            <InputNumber min={0} max={3} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <ProFormDigit
            name="maxPagesPerLevel"
            label={intl.formatMessage({ id: 'pages.web-scraper.maxPagesPerLevel' })}
            min={1}
            max={500}
            fieldProps={{ precision: 0 }}
          />
        </Col>
        <Col span={8}>
          <ProFormSelect
            name="mode"
            label={intl.formatMessage({ id: 'pages.web-scraper.crawlMode' })}
            options={modeOptions.map(opt => ({ label: intl.formatMessage({ id: opt.label}), value: opt.value }))}
            initialValue="breadthFirst"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="urlFilterPattern"
            label={intl.formatMessage({ id: 'pages.web-scraper.urlFilter' })}
            placeholder={intl.formatMessage({ id: 'pages.web-scraper.urlFilterPlaceholder' })}
          />
        </Col>
        <Col span={6}>
          <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.followExternalLinks' })} name="followExternalLinks" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.deduplicate' })} name="deduplicate" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Col>
      </Row>

      <ProFormText
        name="scheduleCron"
        label={intl.formatMessage({ id: 'pages.web-scraper.scheduleCron' })}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.scheduleCronPlaceholder' })}
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
        label={intl.formatMessage({ id: 'pages.web-scraper.filterPrompt' })}
        placeholder={intl.formatMessage({ id: 'pages.web-scraper.filterPromptPlaceholder' })}
        fieldProps={{
          rows: 2,
          showCount: true,
          maxLength: 500,
        }}
      />

      <Form.Item label={intl.formatMessage({ id: 'pages.web-scraper.enableTask' })} name="isEnabled" valuePropName="checked">
        <Switch defaultChecked />
      </Form.Item>
    </ModalForm>
  );
};

export default TaskForm;