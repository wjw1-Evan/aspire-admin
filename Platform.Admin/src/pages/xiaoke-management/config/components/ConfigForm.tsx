import React from 'react';
import { Button, Space } from 'antd';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormSwitch,
  ProFormSlider,
  ProFormDigit,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  createXiaokeConfig,
  updateXiaokeConfig,
  type CreateXiaokeConfigRequest,
  type UpdateXiaokeConfigRequest,
  type XiaokeConfig,
} from '@/services/xiaoke/api';

interface ConfigFormProps {
  config?: XiaokeConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ config, open, onOpenChange, onSuccess }) => {
  const intl = useIntl();
  const message = useMessage();
  const [loading, setLoading] = React.useState(false);

  const isEdit = !!config;

  const modelOptions = [
    { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
  ];

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
        };

        const response = await updateXiaokeConfig(config!.id, updateData);

        if (!response.success) {
          throw new Error(getErrorMessage(response, 'pages.xiaokeManagement.config.message.updateFailed'));
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
          throw new Error(getErrorMessage(response, 'pages.xiaokeManagement.config.message.createFailed'));
        }

        message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.createSuccess' }));
      }

      onSuccess();
      return true;
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.message.error' }));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalForm
      title={isEdit
        ? intl.formatMessage({ id: 'pages.xiaokeManagement.config.editConfig' })
        : intl.formatMessage({ id: 'pages.xiaokeManagement.config.createConfig' })}
      open={open}
      onOpenChange={onOpenChange}
      onFinish={handleSubmit}
      loading={loading}
      width={800}
      initialValues={{
        name: config?.name,
        model: config?.model,
        systemPrompt: config?.systemPrompt,
        temperature: config?.temperature ?? 0.7,
        maxTokens: config?.maxTokens ?? 2000,
        topP: config?.topP ?? 1.0,
        frequencyPenalty: config?.frequencyPenalty ?? 0.0,
        presencePenalty: config?.presencePenalty ?? 0.0,
        isEnabled: config?.isEnabled ?? true,
        isDefault: config?.isDefault ?? false,
      }}
    >
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.name' })}
        placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.namePlaceholder' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.nameRequired' }) }]}
      />

      <ProFormSelect
        name="model"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.model' })}
        placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.modelPlaceholder' })}
        options={modelOptions}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.modelRequired' }) }]}
      />

      <ProFormTextArea
        name="systemPrompt"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.systemPrompt' })}
        placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.systemPromptPlaceholder' })}
        fieldProps={{
          showCount: true,
          maxLength: 2000,
          rows: 4,
        }}
      />

      <ProFormSlider
        name="temperature"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.temperature' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.temperatureTooltip' })}
        min={0}
        max={2}
        step={0.1}
        marks={{ 0: '0', 1: '1', 2: '2' }}
      />

      <ProFormDigit
        name="maxTokens"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.maxTokens' })}
        min={1}
        max={100000}
        fieldProps={{ style: { width: '100%' } }}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.maxTokensRequired' }) }]}
      />

      <ProFormSlider
        name="topP"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.topP' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.topPTooltip' })}
        min={0}
        max={1}
        step={0.1}
        marks={{ 0: '0', 0.5: '0.5', 1: '1' }}
      />

      <ProFormSlider
        name="frequencyPenalty"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.frequencyPenalty' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.frequencyPenaltyTooltip' })}
        min={-2}
        max={2}
        step={0.1}
        marks={{ '-2': '-2', 0: '0', 2: '2' }}
      />

      <ProFormSlider
        name="presencePenalty"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.presencePenalty' })}
        tooltip={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.presencePenaltyTooltip' })}
        min={-2}
        max={2}
        step={0.1}
        marks={{ '-2': '-2', 0: '0', 2: '2' }}
      />

      <ProFormSwitch
        name="isEnabled"
        label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.isEnabled' })}
        valuePropName="checked"
      />

      {!isEdit && (
        <ProFormSwitch
          name="isDefault"
          label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.isDefault' })}
          valuePropName="checked"
        />
      )}
    </ModalForm>
  );
};

export default ConfigForm;
