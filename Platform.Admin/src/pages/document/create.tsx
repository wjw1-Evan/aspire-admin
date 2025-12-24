import React, { useState } from 'react';
import { PageContainer } from '@/components';
import { Card, Form, Input, Button, message, Upload } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useIntl } from '@umijs/max';
import { createDocument } from '@/services/document/api';

const CreateDocument: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await createDocument({
        title: values.title,
        content: values.content,
        documentType: values.documentType,
        category: values.category,
        attachmentIds: values.attachmentIds || [],
        formData: values.formData || {},
      });

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.document.create.message.createSuccess' }));
        navigate('/document/list');
      }
    } catch (error) {
      console.error('创建失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.create.message.createFailed' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'pages.document.create.title' })}
    >
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label={intl.formatMessage({ id: 'pages.document.create.form.title' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.document.create.form.titleRequired' }),
              },
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.document.create.form.titlePlaceholder' })} />
          </Form.Item>

          <Form.Item
            name="documentType"
            label={intl.formatMessage({ id: 'pages.document.create.form.type' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.document.create.form.typeRequired' }),
              },
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.document.create.form.typePlaceholder' })} />
          </Form.Item>

          <Form.Item name="category" label={intl.formatMessage({ id: 'pages.document.create.form.category' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.document.create.form.categoryPlaceholder' })} />
          </Form.Item>

          <Form.Item name="content" label={intl.formatMessage({ id: 'pages.document.create.form.content' })}>
            <Input.TextArea rows={10} placeholder={intl.formatMessage({ id: 'pages.document.create.form.contentPlaceholder' })} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              {intl.formatMessage({ id: 'pages.button.save' })}
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate('/document/list')}>
              {intl.formatMessage({ id: 'pages.button.cancel' })}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default CreateDocument;
