import React, { useState, useEffect } from 'react';
import { Button, Card, Drawer, Form, Input, Select, Switch, Space, Divider, Tabs, Mentions, FormInstance } from 'antd';
import { DeleteOutlined, SaveOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { NODE_CONFIGS } from './WorkflowDesignerConstants';
import { Node } from 'reactflow';
import type { AppUser } from '@/services/user/api';
import type { Role } from '@/services/role/api';
import type { FormDefinition } from '@/services/form/api';
import { getWorkflowFormsAndFields } from '@/services/workflow/api';

const { Option } = Mentions;

interface WorkflowFormField {
  Id: string;
  Label: string;
  DataKey: string;
  Type: string;
  Required: boolean;
}

interface WorkflowForm {
  Id: string;
  Name: string;
  Key: string;
  Fields: WorkflowFormField[];
}

export interface NodeConfigDrawerProps {
  visible: boolean;
  onClose: () => void;
  selectedNode: Node | null;
  configForm: FormInstance;
  onSaveConfig: () => void;
  onDeleteNode: () => void;
  readOnly?: boolean;
  users: AppUser[];
  roles: Role[];
  forms: FormDefinition[];
  availableVariables: { label: string; value: string }[];
  workflowDefinitionId?: string;
}

const NodeConfigDrawer: React.FC<NodeConfigDrawerProps> = ({
  visible,
  onClose,
  selectedNode,
  configForm,
  onSaveConfig,
  onDeleteNode,
  readOnly = false,
  users,
  roles,
  forms,
  availableVariables,
  workflowDefinitionId,
}) => {
  const intl = useIntl();
  const [workflowForms, setWorkflowForms] = useState<WorkflowForm[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载流程中使用的表单及字段
  useEffect(() => {
    if (visible && workflowDefinitionId) {
      setLoading(true);
      getWorkflowFormsAndFields(workflowDefinitionId)
        .then(response => {
          if (response.data?.forms) {
            setWorkflowForms(response.data.forms);
          }
        })
        .catch(error => {
          console.error('加载流程表单失败:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, workflowDefinitionId]);

  // 获取选中表单的字段
  const getSelectedFormFields = (formId: string | undefined): WorkflowFormField[] => {
    if (!formId) return [];
    const form = workflowForms.find(f => f.Id === formId);
    return form?.Fields || [];
  };

  return (
    <Drawer
      title={
        <Space>
          <InfoCircleOutlined style={{ color: '#3b82f6' }} />
          <span>{intl.formatMessage({ id: 'pages.workflow.designer.nodeConfig' })}</span>
        </Space>
      }
      open={visible}
      onClose={onClose}
      size="large"
      className="node-drawer"
      extra={
        <Space>
          {selectedNode?.data.nodeType !== 'start' && !readOnly && (
            <Button danger icon={<DeleteOutlined />} onClick={onDeleteNode}>
              {intl.formatMessage({ id: 'pages.workflow.designer.delete' })}
            </Button>
          )}
          <Button onClick={onClose}>{intl.formatMessage({ id: 'pages.workflow.designer.cancel' })}</Button>
          <Button type="primary" onClick={onSaveConfig} icon={<SaveOutlined />} disabled={readOnly}>
            {intl.formatMessage({ id: 'pages.workflow.designer.save' })}
          </Button>
        </Space>
      }
    >
      <Form form={configForm} layout="vertical" disabled={readOnly}>
        <Tabs
          defaultActiveKey="basic"
          className="config-tabs"
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <>
                  <Form.Item name="nodeType" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeType' })}>
                    <Select disabled>
                      {Object.keys(NODE_CONFIGS).map(key => (
                        <Select.Option key={key} value={key}>
                          {intl.formatMessage({ id: `pages.workflow.designer.add${key.charAt(0).toUpperCase() + key.slice(1)}` })}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="label" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })} rules={[{ required: true }]}>
                    <Input placeholder={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'business',
              label: '业务规则',
              children: (
                <>
                  {selectedNode?.data.nodeType === 'approval' && (
                    <>
                      <Form.Item
                        name="approvalType"
                        label={intl.formatMessage({ id: 'pages.workflow.designer.approvalType' })}
                      >
                        <Select>
                          <Select.Option value={0}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.all' })}</Select.Option>
                          <Select.Option value={1}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.any' })}</Select.Option>
                          <Select.Option value={2}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.sequential' })}</Select.Option>
                        </Select>
                      </Form.Item>

                      <Divider titlePlacement="left" plain>审批人设置</Divider>
                      <Form.List name="approvers">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Card size="small" styles={{ body: { marginBottom: 12, background: '#f8fafc' } }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                                    <Select placeholder="审批方式">
                                      <Select.Option value={0}>指定用户</Select.Option>
                                      <Select.Option value={1}>指定角色</Select.Option>
                                      <Select.Option value={3}>表单字段</Select.Option>
                                    </Select>
                                  </Form.Item>
                                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.approvers?.[name]?.type !== curr.approvers?.[name]?.type}>
                                    {({ getFieldValue }) => {
                                      const type = getFieldValue(['approvers', name, 'type']);
                                      if (type === 0) return <Form.Item {...restField} name={[name, 'userIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择用户" options={users.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>;
                                      if (type === 1) return <Form.Item {...restField} name={[name, 'roleIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择角色" options={roles.map(r => ({ label: r.name, value: r.id }))} /></Form.Item>;
                                      if (type === 3) return (
                                        <Form.Item {...restField} name={[name, 'formFieldKey']} rules={[{ required: true }]}>
                                          <Select
                                            placeholder="选择表单字段"
                                            showSearch
                                            options={availableVariables.map(v => ({ label: v.label, value: v.value }))}
                                          />
                                        </Form.Item>
                                      );
                                      return null;
                                    }}
                                  </Form.Item>
                                </div>
                              </Card>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加审批人</Button>
                          </>
                        )}
                      </Form.List>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'condition' && (
                    <>
                      <Form.Item name="logicalOperator" label="逻辑运算符">
                        <Select>
                          <Select.Option value="and">AND (且)</Select.Option>
                          <Select.Option value="or">OR (或)</Select.Option>
                        </Select>
                      </Form.Item>

                      <Divider titlePlacement="left" plain>条件规则</Divider>
                      <Form.List name="conditions">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Card
                                size="small"
                                style={{ marginBottom: 12, background: '#f8fafc' }}
                                key={key}
                                extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}
                              >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  {/* 第一级：选择表单 */}
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'formId']}
                                    label="表单"
                                    rules={[{ required: true, message: '请选择表单' }]}
                                  >
                                    <Select
                                      placeholder="选择流程中使用的表单"
                                      showSearch
                                      loading={loading}
                                      options={workflowForms.map(f => ({ label: f.Name, value: f.Id }))}
                                    />
                                  </Form.Item>

                                  {/* 第二级：选择字段 */}
                                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.conditions?.[name]?.formId !== curr.conditions?.[name]?.formId}>
                                    {({ getFieldValue }) => {
                                      const formId = getFieldValue(['conditions', name, 'formId']);
                                      const fields = getSelectedFormFields(formId);
                                      return (
                                        <Form.Item
                                          {...restField}
                                          name={[name, 'variable']}
                                          label="字段"
                                          rules={[{ required: true, message: '请选择字段' }]}
                                        >
                                          <Select
                                            placeholder="选择表单字段"
                                            showSearch
                                            disabled={!formId}
                                            options={fields.map(f => ({
                                              label: `${f.Label} (${f.DataKey})`,
                                              value: f.DataKey
                                            }))}
                                          />
                                        </Form.Item>
                                      );
                                    }}
                                  </Form.Item>

                                  <Form.Item
                                    {...restField}
                                    name={[name, 'operator']}
                                    label="操作符"
                                    rules={[{ required: true, message: '请选择操作符' }]}
                                  >
                                    <Select placeholder="选择操作符">
                                      <Select.Option value="equals">等于 (==)</Select.Option>
                                      <Select.Option value="not_equals">不等于 (!=)</Select.Option>
                                      <Select.Option value="greater_than">大于 (&gt;)</Select.Option>
                                      <Select.Option value="less_than">小于 (&lt;)</Select.Option>
                                      <Select.Option value="greater_than_or_equal">大于等于 (&gt;=)</Select.Option>
                                      <Select.Option value="less_than_or_equal">小于等于 (&lt;=)</Select.Option>
                                      <Select.Option value="contains">包含 (Contains)</Select.Option>
                                    </Select>
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'value']}
                                    label="比较值"
                                    rules={[{ required: true, message: '请输入比较值' }]}
                                  >
                                    <Input placeholder="输入值" />
                                  </Form.Item>
                                </Space>
                              </Card>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              添加条件规则
                            </Button>
                          </>
                        )}
                      </Form.List>

                      <Divider titlePlacement="left" plain>高级表达式 (可选)</Divider>
                      <Form.Item name="expression" label="自定义 C# 表达式" tooltip="如果结构化规则无法满足，可在此输入原始表达式">
                        <Input.TextArea rows={2} placeholder="例如: Request.Amount > 1000" />
                      </Form.Item>
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'advanced',
              label: '高级设置',
              children: (
                <>
                  {selectedNode?.data.nodeType === 'approval' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Form.Item name="allowDelegate" label="允许委托申请" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="allowReject" label="允许驳回" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="allowReturn" label="允许退回" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="timeoutHours" label="审批超时设置 (小时)"><Input type="number" /></Form.Item>
                    </div>
                  )}
                  {selectedNode?.data.nodeType === 'start' && (
                    <Form.Item name="formDefinitionId" label="绑定启动表单">
                      <Select placeholder="选择流程启动时需要填写的表单" allowClear options={forms.map(f => ({ label: f.name, value: f.id }))} />
                    </Form.Item>
                  )}
                </>
              ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
};

export default NodeConfigDrawer;
