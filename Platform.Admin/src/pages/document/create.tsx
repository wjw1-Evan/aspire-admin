import React, { useState, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Upload, message } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import {
  ProForm,
  ProFormSelect,
} from '@ant-design/pro-form';
import { useMessage } from '@/hooks/useMessage';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useIntl } from '@umijs/max';
import { getWorkflowList } from '@/services/workflow/api';

const CreateDocument: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <PageContainer>
      <ProCard>
        <ProForm
          layout="vertical"
          submitter={{
            searchConfig: {
              submitText: intl.formatMessage({ id: 'pages.button.next', defaultMessage: '下一步' }),
              resetText: intl.formatMessage({ id: 'pages.button.cancel' }),
            },
            submitButtonProps: {
              icon: <SaveOutlined />,
            },
            resetButtonProps: {
              onClick: () => {
                navigate('/document/list');
              },
            },
          }}
          onFinish={async (values) => {
            const definitionId: string | undefined = values.workflowDefinitionId;
            if (!definitionId) {
              message.error(intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请先选择流程' }));
              return false;
            }
            setLoading(true);
            try {
              navigate(`/document/create-by-workflow?definitionId=${definitionId}`);
              return true;
            } finally {
              setLoading(false);
            }
          }}
          request={async () => {
            try {
              const resp = await getWorkflowList({ page: 1 });
              if (resp.success && resp.data) {
                return { workflowDefinitionId: undefined };
              }
            } catch (e) {
              console.error('加载流程列表失败:', e);
            }
            return { workflowDefinitionId: undefined };
          }}
        >
          <ProFormSelect
            name="workflowDefinitionId"
            label={intl.formatMessage({ id: 'pages.workflow.select', defaultMessage: '选择流程' })}
            placeholder={intl.formatMessage({ id: 'pages.workflow.select.placeholder', defaultMessage: '请选择流程定义' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请选择流程定义' }) }]}
            request={async () => {
              try {
                const resp = await getWorkflowList({ page: 1 });
                if (resp.success && resp.data) {
                  return (resp.data.queryable || []).map((wf) => ({ label: wf.name, value: wf.id! }));
                }
              } catch (e) {
                console.error('加载流程列表失败:', e);
              }
              return [];
            }}
            fieldProps={{
              showSearch: true,
              filterOption: (input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase()),
            }}
          />

          <ProForm.Item
            name="attachments"
            label={intl.formatMessage({ id: 'pages.document.create.form.attachments', defaultMessage: '附件（可在下一步继续上传）' })}
            extra={intl.formatMessage({ id: 'pages.document.create.form.uploadDescription', defaultMessage: '可在下一步继续上传更多附件' })}
          >
            <Upload
              name="files"
              multiple
              maxCount={10}
              action="/apiservice/api/upload"
              listType="text"
            >
              <Button icon={<UploadOutlined />}>
                {intl.formatMessage({ id: 'pages.document.create.form.uploadButton', defaultMessage: '上传附件' })}
              </Button>
            </Upload>
          </ProForm.Item>
          </ProForm>
        </ProCard>
    </PageContainer>
  );
};

export default CreateDocument;
