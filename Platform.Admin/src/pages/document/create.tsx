import React, { useState, useCallback } from 'react';
import { ProCard } from '@ant-design/pro-components/es/card';
import { ProForm, ProFormSelect } from '@ant-design/pro-components/es/form';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { Button, Upload } from 'antd';
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
              submitText: intl.formatMessage({ id: 'pages.button.next' }),
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
              message.error(intl.formatMessage({ id: 'pages.workflow.select.definition' }));
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
            label={intl.formatMessage({ id: 'pages.workflow.select' })}
            placeholder={intl.formatMessage({ id: 'pages.workflow.select.placeholder' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.select.definition' }) }]}
            request={async () => {
              try {
                const resp = await getWorkflowList({ page: 1 });
                if (resp.success && resp.data) {
                  return (resp.data.queryable || []).map((wf: any) => ({ label: wf.name, value: wf.id! }));
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
            label={intl.formatMessage({ id: 'pages.document.create.form.attachments' })}
            extra={intl.formatMessage({ id: 'pages.document.create.form.uploadDescription' })}
          >
            <Upload
              name="files"
              multiple
              maxCount={10}
              action="/apiservice/api/upload"
              listType="text"
            >
              <Button icon={<UploadOutlined />}>
                {intl.formatMessage({ id: 'pages.document.create.form.uploadButton' })}
              </Button>
            </Upload>
          </ProForm.Item>
          </ProForm>
        </ProCard>
    </PageContainer>
  );
};

export default CreateDocument;

