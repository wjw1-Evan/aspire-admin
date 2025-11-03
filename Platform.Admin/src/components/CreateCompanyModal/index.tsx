import React from 'react';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { useIntl } from '@umijs/max';
import { createCompany } from '@/services/company';

interface CreateCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 新建企业模态框组件
 */
export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const intl = useIntl();

  /**
   * 提交创建企业
   */
  const handleSubmit = async (values: API.CreateCompanyRequest) => {
    try {
      // 企业代码由后端自动生成，不需要传递
      const { code: _code, ...requestData } = values;
      
      const response = await createCompany(requestData);
      if (response.success && response.data) {
        message.success(intl.formatMessage({ id: 'pages.company.createSuccess' }));
        onSuccess();
        onClose();
        return true;
      } else {
        message.error(response.errorMessage || intl.formatMessage({ id: 'pages.company.createFailed' }));
        return false;
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.company.createFailed' }));
      return false;
    }
  };

  return (
    <ModalForm<API.CreateCompanyRequest>
      title={intl.formatMessage({ id: 'pages.company.createTitle' })}
      open={open}
      onOpenChange={(visible) => {
        if (!visible) {
          onClose();
        }
      }}
      onFinish={handleSubmit}
      width={600}
      layout="vertical"
      modalProps={{
        destroyOnClose: true,
      }}
    >
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.company.nameLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.company.namePlaceholder' })}
        rules={[
          { required: true, message: intl.formatMessage({ id: 'pages.company.nameRequired' }) },
          { min: 2, max: 100, message: intl.formatMessage({ id: 'pages.company.nameLength' }) },
        ]}
        fieldProps={{
          maxLength: 100,
        }}
      />

      <ProFormText
        name="description"
        label={intl.formatMessage({ id: 'pages.company.descriptionLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.company.descriptionPlaceholder' })}
        rules={[{ max: 500, message: intl.formatMessage({ id: 'pages.company.descriptionMaxLength' }) }]}
        fieldProps={{
          maxLength: 500,
        }}
      />

      <ProFormText
        name="industry"
        label={intl.formatMessage({ id: 'pages.company.industryLabel' })}
        placeholder={intl.formatMessage({ id: 'pages.company.industryPlaceholder' })}
        rules={[{ max: 50, message: intl.formatMessage({ id: 'pages.company.industryMaxLength' }) }]}
        fieldProps={{
          maxLength: 50,
        }}
      />
    </ModalForm>
  );
};

