import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { message } from 'antd';
import { useIntl } from '@umijs/max';
import { updateCurrentCompany } from '@/services/company';

interface EditCompanyModalProps {
  visible: boolean;
  company: API.Company | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function EditCompanyModal({
  visible,
  company,
  onCancel,
  onSuccess,
}: EditCompanyModalProps) {
  const intl = useIntl();

  const handleSubmit = async (values: API.UpdateCompanyRequest) => {
    try {
      const response = await updateCurrentCompany(values);

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.companySettings.edit.updateSuccess' }));
        onSuccess();
        return true;
      }

      message.error(response.errorMessage || intl.formatMessage({ id: 'pages.companySettings.edit.updateFailed' }));
      return false;
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.companySettings.edit.updateFailed' }));
      return false;
    }
  };

  return (
    <ModalForm
      title={intl.formatMessage({ id: 'pages.companySettings.edit.title' })}
      open={visible}
      onFinish={handleSubmit}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      initialValues={company || undefined}
      width={600}
    >
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.companySettings.edit.nameLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.namePlaceholder' })}
        rules={[
          { required: true, message: intl.formatMessage({ id: 'pages.companySettings.edit.nameRequired' }) },
          { min: 2, max: 100, message: intl.formatMessage({ id: 'pages.companySettings.edit.nameLength' }) },
        ]}
      />

      <ProFormTextArea
        name="description"
        label={intl.formatMessage({ id: 'pages.companySettings.edit.descriptionLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.descriptionPlaceholder' })}
        fieldProps={{
          rows: 3,
          maxLength: 500,
          showCount: true,
        }}
      />

      <ProFormText
        name="industry"
        label={intl.formatMessage({ id: 'pages.companySettings.edit.industryLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.industryPlaceholder' })}
        rules={[{ max: 50, message: intl.formatMessage({ id: 'pages.companySettings.edit.industryMaxLength' }) }]}
      />

      <ProFormText
        name="contactName"
        label={intl.formatMessage({ id: 'pages.companySettings.edit.contactNameLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.contactNamePlaceholder' })}
        rules={[{ max: 50, message: intl.formatMessage({ id: 'pages.companySettings.edit.contactNameMaxLength' }) }]}
      />

      <ProFormText
        name="contactEmail"
        label={intl.formatMessage({ id: 'pages.companySettings.edit.contactEmailLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.contactEmailPlaceholder' })}
        rules={[{ type: 'email', message: intl.formatMessage({ id: 'pages.companySettings.edit.contactEmailInvalid' }) }]}
      />

      <ProFormText
        name="contactPhone"
        label={intl.formatMessage({ id: 'pages.companySettings.edit.contactPhoneLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.contactPhonePlaceholder' })}
        rules={[
          {
            pattern: /^1[3-9]\d{9}$/,
            message: intl.formatMessage({ id: 'pages.companySettings.edit.contactPhoneInvalid' }),
          },
        ]}
      />

      <ProFormText
        name="logo"
        label={intl.formatMessage({ id: 'pages.companySettings.edit.logoLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.logoPlaceholder' })}
        tooltip={intl.formatMessage({ id: 'pages.companySettings.edit.logoTooltip' })}
      />
    </ModalForm>
  );
}
