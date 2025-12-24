import React, { useState } from 'react';
import { PageContainer } from '@/components';
import { Card, Form, Input, Button, message, Upload } from 'antd';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useIntl } from '@umijs/max';
import { uploadDocumentAttachment } from '@/services/document/api';
import { getWorkflowList } from '@/services/workflow/api';
import type { UploadFile, UploadProps } from 'antd';

const CreateDocument: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [attachmentFileList, setAttachmentFileList] = useState<UploadFile[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<{ label: string; value: string }[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await getWorkflowList({ current: 1, pageSize: 100 });
        if (resp.success && resp.data) {
          const options = (resp.data.list || []).map((wf) => ({ label: wf.name, value: wf.id! }));
          setWorkflowOptions(options);
        }
      } catch (e) {
        console.error('加载流程列表失败:', e);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const definitionId: string | undefined = values.workflowDefinitionId;
      if (!definitionId) {
        message.error(intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请先选择流程' }));
        return;
      }
      setLoading(true);
      // 跳转到“按流程表单创建并启动”页面，并携带选定流程ID
      navigate(`/document/create-by-workflow?definitionId=${definitionId}`);
    } catch (error) {
      console.error('下一步失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.create.message.createFailed', defaultMessage: '操作失败' }));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    fileList: attachmentFileList,
    multiple: true,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      try {
        const response = await uploadDocumentAttachment(file as File);
        if (response.success && response.data?.id) {
          const ids = form.getFieldValue('attachmentIds') || [];
          form.setFieldsValue({ attachmentIds: [...ids, response.data.id] });

          const newFile: UploadFile = {
            uid: response.data.id,
            name: response.data.name || (file as any).name,
            status: 'done',
            url: response.data.url,
            size: response.data.size,
            type: response.data.contentType,
            response,
          };

          setAttachmentFileList((prev) => [...prev, newFile]);
          onSuccess?.(response, file as any);
        } else {
          const msg = response.message || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
          message.error(msg);
          onError?.(new Error(msg));
        }
      } catch (err: any) {
        const msg = err?.message || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
        message.error(msg);
        onError?.(err as Error);
      }
    },
    onRemove: (file) => {
      const currentIds: string[] = form.getFieldValue('attachmentIds') || [];
      const filtered = currentIds.filter((id) => id !== file.uid);
      form.setFieldsValue({ attachmentIds: filtered });
      setAttachmentFileList((prev) => prev.filter((f) => f.uid !== file.uid));
      return true;
    },
  };

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'pages.document.create.title' })}
    >
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ attachmentIds: [] }}>
          <Form.Item
            name="workflowDefinitionId"
            label={intl.formatMessage({ id: 'pages.workflow.select', defaultMessage: '选择流程' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请选择流程定义' }) }]}
          >
            <Select options={workflowOptions} placeholder={intl.formatMessage({ id: 'pages.workflow.select.placeholder', defaultMessage: '请选择流程定义' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'pages.document.create.form.attachments', defaultMessage: '附件（可在下一步继续上传）' })}>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>
                {intl.formatMessage({ id: 'pages.document.create.form.uploadButton', defaultMessage: '上传附件' })}
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item name="attachmentIds" hidden />

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              {intl.formatMessage({ id: 'pages.button.next', defaultMessage: '下一步' })}
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
