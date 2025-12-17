import React from 'react';
import { Modal, Form, Input, message } from 'antd';
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

  const [form] = Form.useForm();

  return (
    <Modal
      title={intl.formatMessage({ id: 'pages.company.createTitle' })}
      open={open}
      onCancel={onClose}
      onOk={async () => {
        try {
          const values = await form.validateFields();
          await handleSubmit(values);
          form.resetFields();
        } catch (error) {
          // 表单验证失败，不关闭 Modal
        }
      }}
      width={600}
      destroyOnClose={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label={intl.formatMessage({ id: 'pages.company.nameLabel' })}
          rules={[
            { required: true, message: intl.formatMessage({ id: 'pages.company.nameRequired' }) },
            { min: 2, max: 100, message: intl.formatMessage({ id: 'pages.company.nameLength' }) },
          ]}
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.company.namePlaceholder' })}
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={intl.formatMessage({ id: 'pages.company.descriptionLabel' })}
          rules={[{ max: 500, message: intl.formatMessage({ id: 'pages.company.descriptionMaxLength' }) }]}
        >
          <Input.TextArea
            placeholder={intl.formatMessage({ id: 'pages.company.descriptionPlaceholder' })}
            maxLength={500}
            rows={3}
          />
        </Form.Item>

        <Form.Item
          name="industry"
          label={intl.formatMessage({ id: 'pages.company.industryLabel' })}
          rules={[{ max: 50, message: intl.formatMessage({ id: 'pages.company.industryMaxLength' }) }]}
        >
          <Input
            placeholder={intl.formatMessage({ id: 'pages.company.industryPlaceholder' })}
            maxLength={50}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

