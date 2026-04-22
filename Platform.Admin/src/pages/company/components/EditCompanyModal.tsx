import { ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-form';
import { useIntl } from '@umijs/max';
import Settings from '../../../../config/defaultSettings';
import { updateCurrentCompany } from '@/services/company';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Company } from '@/types';
import React from 'react';
import { Tooltip } from 'antd';

interface EditCompanyModalProps {
  open: boolean;
  company: Company | null;
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

  return (
    <ModalForm
      title={intl.formatMessage({ id: 'pages.companySettings.edit.title' })}
      open={open}
      onOpenChange={(visible) => {
        if (!visible) {
          onCancel();
        }
      }}
      width={600}
      layout="vertical"
      initialValues={company || undefined}
      onFinish={async (values) => {
        try {
          const response = await updateCurrentCompany(values);

          if (response.success) {
            onSuccess();
            return true;
          }

          throw new Error(getErrorMessage(response, 'pages.companySettings.edit.updateFailed'));
        } catch (error) {
          return false;
        }
      }}
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
        label={
          <span>
            {intl.formatMessage({ id: 'pages.companySettings.edit.logoLabel' })}
            <Tooltip title={intl.formatMessage({ id: 'pages.companySettings.edit.logoTooltip' })}>
              <span style={{ marginLeft: 4, cursor: 'help' }}>ℹ️</span>
            </Tooltip>
          </span>
        }
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.logoPlaceholder' })}
      />

      <ProFormText
        name="displayName"
        label={
          <span>
            {intl.formatMessage({ id: 'pages.companySettings.edit.displayNameLabel' })}
            <Tooltip title={intl.formatMessage({ id: 'pages.companySettings.edit.displayNameTooltip' }, { title: Settings.title })}>
              <span style={{ marginLeft: 4, cursor: 'help' }}>ℹ️</span>
            </Tooltip>
          </span>
        }
        placeholder={intl.formatMessage({ id: 'pages.companySettings.edit.displayNamePlaceholder' })}
        fieldProps={{
          maxLength: 100,
        }}
      />
    </ModalForm>
  );
}
