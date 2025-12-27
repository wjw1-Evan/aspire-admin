import React, { useEffect } from 'react';
import { Form, Input, Select, Switch, Button, Space, Slider, InputNumber } from 'antd';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import {
  createXiaokeConfig,
  updateXiaokeConfig,
  type CreateXiaokeConfigRequest,
  type UpdateXiaokeConfigRequest,
  type XiaokeConfig,
} from '@/services/xiaoke/api';

const { TextArea } = Input;

interface ConfigFormProps {
  config?: XiaokeConfig | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ config, onSuccess, onCancel }) => {
  const intl = useIntl();
  const message = useMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEdit = !!config;

  // AI模型选项
  const modelOptions = [
    { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },

  ];

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        name: config.name,
        model: config.model,
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        isEnabled: config.isEnabled,
        isDefault: config.isDefault,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isEnabled: true,
        isDefault: false,
      });
    }
  }, [config, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        const updateData: UpdateXiaokeConfigRequest = {
          name: values.name || undefined,
          model: values.model || undefined,
          systemPrompt: values.systemPrompt || undefined,
          temperature: values.temperature,
          maxTokens: values.maxTokens,
          topP: values.topP,
          frequencyPenalty: values.frequencyPenalty,
          presencePenalty: values.presencePenalty,
          isEnabled: values.isEnabled,
          // 编辑模式下不允许修改 isDefault，需要通过专门的接口设置
        };

        const response = await updateXiaokeConfig(config!.id, updateData);

        if (!response.success) {
          throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.updateFailed' }));
        }

        message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.updateSuccess' }));
      } else {
        const createData: CreateXiaokeConfigRequest = {
          name: values.name,
          model: values.model,
          systemPrompt: values.systemPrompt || '',
          temperature: values.temperature,
          maxTokens: values.maxTokens,
          topP: values.topP,
          frequencyPenalty: values.frequencyPenalty,
          presencePenalty: values.presencePenalty,
          isEnabled: values.isEnabled,
          isDefault: values.isDefault,
        };

        const response = await createXiaokeConfig(createData);

        if (!response.success) {
          throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.createFailed' }));
        }

        message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.createSuccess' }));
      }

      onSuccess();
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.message.error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isEnabled: true,
        isDefault: false,
      }}
    >
      <Form.Item
        name="name"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.name' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.nameRequired' }) }]}
      >
        <Input placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.namePlaceholder' })} />
      </Form.Item>

      <Form.Item
        name="model"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.model' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.modelRequired' }) }]}
      >
        <Select placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.modelPlaceholder' })} options={modelOptions} />
      </Form.Item>

      <Form.Item name="systemPrompt" label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.systemPrompt' })}>
        <TextArea
          rows={4}
          placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.systemPromptPlaceholder' })}
          showCount
          maxLength={2000}
        />
      </Form.Item>

      <Form.Item
        name="temperature"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.temperature' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.temperatureTooltip' })}
      >
        <Slider min={0} max={2} step={0.1} marks={{ 0: '0', 1: '1', 2: '2' }} />
      </Form.Item>

      <Form.Item
        name="maxTokens"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.maxTokens' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.maxTokensRequired' }) }]}
      >
        <InputNumber min={1} max={100000} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="topP"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.topP' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.topPTooltip' })}
      >
        <Slider min={0} max={1} step={0.1} marks={{ 0: '0', 0.5: '0.5', 1: '1' }} />
      </Form.Item>

      <Form.Item
        name="frequencyPenalty"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.frequencyPenalty' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.frequencyPenaltyTooltip' })}
      >
        <Slider
          min={-2}
          max={2}
          step={0.1}
          marks={{ '-2': '-2', 0: '0', 2: '2' }}
        />
      </Form.Item>

      <Form.Item
        name="presencePenalty"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.presencePenalty' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.presencePenaltyTooltip' })}
      >
        <Slider
          min={-2}
          max={2}
          step={0.1}
          marks={{ '-2': '-2', 0: '0', 2: '2' }}
        />
      </Form.Item>

      <Form.Item name="isEnabled" valuePropName="checked" label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.isEnabled' })}>
        <Switch />
      </Form.Item>

      {!isEdit && (
        <Form.Item name="isDefault" valuePropName="checked" label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.isDefault' })}>
          <Switch />
        </Form.Item>
      )}

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit
              ? intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.submit.update' })
              : intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.submit.create' })}
          </Button>
          <Button onClick={onCancel}>{intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.cancel' })}</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default ConfigForm;
