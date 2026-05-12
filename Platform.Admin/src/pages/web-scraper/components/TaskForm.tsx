import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Switch, Row, Col } from 'antd';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import { ApiResponse } from '@/types';
import { useMessage } from '@/hooks/useMessage';

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
  { label: 'pages.webScraper.mode.single', value: 'singlePage' },
  { label: 'pages.webScraper.mode.depth', value: 'depthFirst' },
  { label: 'pages.webScraper.mode.breadth', value: 'breadthFirst' },
];

const api = {
  create: (data: TaskFormValues) =>
    request<ApiResponse<any>>('/apiservice/api/web-scraper/tasks', { method: 'POST', data }),
  update: (id: string, data: TaskFormValues) =>
    request<ApiResponse<any>>(`/apiservice/api/web-scraper/tasks/${id}`, { method: 'PUT', data }),
};

const TaskForm: React.FC<TaskFormProps> = ({ visible, task, onCancel, onSuccess }) => {
  const intl = useIntl();
  const message = useMessage();
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
      message.error(task?.id ? intl.formatMessage({ id: 'pages.webScraper.message.updateFailed' }) : intl.formatMessage({ id: 'pages.webScraper.message.createFailed' }));
    }
    return true;
  };

  return (
    <ModalForm
      title={task?.id ? intl.formatMessage({ id: 'pages.webScraper.editTask' }) : intl.formatMessage({ id: 'pages.webScraper.createTask' })}
      open={visible}
      form={form}
      onFinish={handleFinish}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      modalProps={{
        width: 700,
        destroyOnHidden: true,
      }}
      submitter={{
        searchConfig: {
          submitText: task?.id ? intl.formatMessage({ id: 'pages.webScraper.update' }) : intl.formatMessage({ id: 'pages.webScraper.submit' }),
          resetText: intl.formatMessage({ id: 'pages.webScraper.cancel' }),
        },
      }}
    >
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.webScraper.taskName' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.webScraper.taskNameRequired' }) }]}
        placeholder={intl.formatMessage({ id: 'pages.webScraper.taskNamePlaceholder' })}
      />

      <ProFormText
        name="targetUrl"
        label={intl.formatMessage({ id: 'pages.webScraper.targetUrl' })}
        rules={[
          { required: true, message: intl.formatMessage({ id: 'pages.webScraper.targetUrlRequired' }) },
          { type: 'url', message: intl.formatMessage({ id: 'pages.webScraper.targetUrlInvalid' }) },
        ]}
        placeholder={intl.formatMessage({ id: 'pages.webScraper.targetUrlPlaceholder' })}
      />

      <ProFormTextArea
        name="description"
        label={intl.formatMessage({ id: 'pages.webScraper.description' })}
        placeholder={intl.formatMessage({ id: 'pages.webScraper.descriptionPlaceholder' })}
      />

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="titleSelector"
            label={intl.formatMessage({ id: 'pages.webScraper.titleSelector' })}
            placeholder={intl.formatMessage({ id: 'pages.webScraper.titleSelectorPlaceholder' })}
            tooltip={intl.formatMessage({ id: 'pages.webScraper.titleSelectorTooltip' })}
          />
        </Col>
        <Col span={12}>
          <ProFormText
            name="contentSelector"
            label={intl.formatMessage({ id: 'pages.webScraper.contentSelector' })}
            placeholder={intl.formatMessage({ id: 'pages.webScraper.contentSelectorPlaceholder' })}
            tooltip={intl.formatMessage({ id: 'pages.webScraper.contentSelectorTooltip' })}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={intl.formatMessage({ id: 'pages.webScraper.crawlDepth' })} name="crawlDepth">
            <InputNumber min={0} max={3} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <ProFormDigit
            name="maxPagesPerLevel"
            label={intl.formatMessage({ id: 'pages.webScraper.maxPagesPerLevel' })}
            min={1}
            max={500}
            fieldProps={{ precision: 0 }}
          />
        </Col>
        <Col span={8}>
          <ProFormSelect
            name="mode"
            label={intl.formatMessage({ id: 'pages.webScraper.crawlMode' })}
            options={modeOptions.map(opt => ({ label: intl.formatMessage({ id: opt.label}), value: opt.value }))}
            initialValue="breadthFirst"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name="urlFilterPattern"
            label={intl.formatMessage({ id: 'pages.webScraper.urlFilter' })}
            placeholder={intl.formatMessage({ id: 'pages.webScraper.urlFilterPlaceholder' })}
          />
        </Col>
        <Col span={6}>
          <Form.Item label={intl.formatMessage({ id: 'pages.webScraper.followExternalLinks' })} name="followExternalLinks" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label={intl.formatMessage({ id: 'pages.webScraper.deduplicate' })} name="deduplicate" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Col>
      </Row>

      <ProFormText
        name="scheduleCron"
        label={intl.formatMessage({ id: 'pages.webScraper.scheduleCron' })}
        placeholder={intl.formatMessage({ id: 'pages.webScraper.scheduleCronPlaceholder' })}
        tooltip={
          <div>
            <p>{intl.formatMessage({ id: 'pages.webScraper.examples' })}</p>
              <ul>
                <li>{intl.formatMessage({ id: 'pages.webScraper.every10Minutes' })}：<code>*/10 * * * *</code></li>
                <li>{intl.formatMessage({ id: 'pages.webScraper.everyHour' })}：<code>0 * * * *</code></li>
                <li>{intl.formatMessage({ id: 'pages.webScraper.dailyDawn' })}：<code>0 0 * * *</code></li>
              </ul>
          </div>
        }
      />

       <Row gutter={16}>
         <Col span={6}>
           <Form.Item label={intl.formatMessage({ id: 'pages.webScraper.enableFilter' })} name="enableFilter" valuePropName="checked">
             <Switch />
           </Form.Item>
         </Col>
         <Col span={6}>
           <Form.Item label={intl.formatMessage({ id: 'pages.webScraper.matchNotification' })} name="notifyOnMatch" valuePropName="checked">
             <Switch defaultChecked />
           </Form.Item>
         </Col>
       </Row>

      <ProFormTextArea
        name="filterPrompt"
        label={intl.formatMessage({ id: 'pages.webScraper.filterPrompt' })}
        placeholder={intl.formatMessage({ id: 'pages.webScraper.filterPromptPlaceholder' })}
        fieldProps={{
          rows: 2,
          showCount: true,
          maxLength: 500,
        }}
      />

      <Form.Item label={intl.formatMessage({ id: 'pages.webScraper.enableTask' })} name="isEnabled" valuePropName="checked">
        <Switch defaultChecked />
      </Form.Item>
    </ModalForm>
  );
};

export default TaskForm;