import { Modal, Form, Input, Tooltip } from 'antd';
import { useIntl } from '@umijs/max';
import { updateCurrentCompany } from '@/services/company';
import React from 'react';

interface EditCompanyModalProps {
  open: boolean;
  company: API.Company | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function EditCompanyModal({
  open,
  company,
  onCancel,
  onSuccess,
}: EditCompanyModalProps) {
  const intl = useIntl();
  const [form] = Form.useForm();

  React.useEffect(() => {
    // 只在 Modal 打开时设置表单值
    // 关闭时不需要重置，因为 destroyOnHidden 会销毁 Form
    if (open && company) {
      form.setFieldsValue(company);
    }
  }, [open, company, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const response = await updateCurrentCompany(values);

      if (response.success) {
        // 成功时调用回调，由父组件处理成功提示
        onSuccess();
        form.resetFields();
        return;
      }

      // 失败时抛出错误，由全局错误处理统一处理
      throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.companySettings.edit.updateFailed' }));
    } catch (error) {
      // 表单验证失败时不关闭 Modal
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      throw error;
    }
  };

  return (
    <Modal
      title={intl.formatMessage({ id: 'pages.companySettings.edit.title' })}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={company || undefined}
      >
        <Form.Item
          name="name"
          label={intl.formatMessage({ id: 'pages.companySettings.edit.nameLabel' })}
          rules={[
            { required: true, message: intl.formatMessage({ id: 'pages.companySettings.edit.nameRequired' }) },
            { min: 2, max: 100, message: intl.formatMessage({ id: 'pages.companySettings.edit.nameLength' }) },
          ]}
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.namePlaceholder' })}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={intl.formatMessage({ id: 'pages.companySettings.edit.descriptionLabel' })}
        >
          <Input.TextArea
            placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.descriptionPlaceholder' })}
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="industry"
          label={intl.formatMessage({ id: 'pages.companySettings.edit.industryLabel' })}
          rules={[{ max: 50, message: intl.formatMessage({ id: 'pages.companySettings.edit.industryMaxLength' }) }]}
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.industryPlaceholder' })}
          />
        </Form.Item>

        <Form.Item
          name="contactName"
          label={intl.formatMessage({ id: 'pages.companySettings.edit.contactNameLabel' })}
          rules={[{ max: 50, message: intl.formatMessage({ id: 'pages.companySettings.edit.contactNameMaxLength' }) }]}
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.contactNamePlaceholder' })}
          />
        </Form.Item>

        <Form.Item
          name="contactEmail"
          label={intl.formatMessage({ id: 'pages.companySettings.edit.contactEmailLabel' })}
          rules={[{ type: 'email', message: intl.formatMessage({ id: 'pages.companySettings.edit.contactEmailInvalid' }) }]}
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.contactEmailPlaceholder' })}
          />
        </Form.Item>

        <Form.Item
          name="contactPhone"
          label={intl.formatMessage({ id: 'pages.companySettings.edit.contactPhoneLabel' })}
          rules={[
            {
              pattern: /^1[3-9]\d{9}$/,
              message: intl.formatMessage({ id: 'pages.companySettings.edit.contactPhoneInvalid' }),
            },
          ]}
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.contactPhonePlaceholder' })}
          />
        </Form.Item>

        <Form.Item
          name="logo"
          label={
            <span>
              {intl.formatMessage({ id: 'pages.companySettings.edit.logoLabel' })}
              <Tooltip title={intl.formatMessage({ id: 'pages.companySettings.edit.logoTooltip' })}>
                <span style={{ marginLeft: 4, cursor: 'help' }}>ℹ️</span>
              </Tooltip>
            </span>
          }
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.logoPlaceholder' })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
