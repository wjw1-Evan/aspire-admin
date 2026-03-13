import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Drawer, Form, Input, Select, Switch, Space, Divider, Tabs, FormInstance } from 'antd';
import { DeleteOutlined, SaveOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { NODE_CONFIGS } from './WorkflowDesignerConstants';
import { Node } from 'reactflow';
import type { AppUser } from '@/services/user/api';
import type { Role } from '@/services/role/api';
import type { FormDefinition } from '@/services/form/api';
import { getWorkflowFormsAndFields } from '@/services/workflow/api';
import type { SelectProps } from 'antd';

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
  allNodes?: Node[];
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
  allNodes = [],
}) => {
  const intl = useIntl();
  const [workflowForms, setWorkflowForms] = useState<WorkflowForm[]>([]);
  const [loading, setLoading] = useState(false);

  // 从前端节点数据中提取表单信息
  const extractFormsFromNodes = useCallback(() => {
    const formMap = new Map<string, WorkflowForm>();

    // 遍历所有节点，收集绑定的表单
    allNodes.forEach(node => {
      const config = node.data?.config;
      if (config?.form?.formDefinitionId) {
        const formId = config.form.formDefinitionId;
        // 从 forms 列表中查找对应的表单定义
        const formDef = forms.find(f => f.id === formId);
        if (formDef && !formMap.has(formId)) {
          formMap.set(formId, {
            Id: formDef.id || 'unknown',
            Name: formDef.name || '',
            Key: formDef.key || '',
            Fields: (formDef.fields || []).map(field => ({
              Id: field.id || 'unknown',
              Label: field.label || '',
              DataKey: field.dataKey || '',
              Type: field.type,
              Required: field.required || false,
            })),
          });
        }
      }
    });

    return Array.from(formMap.values());
  }, [allNodes, forms]);

  // 当 drawer 打开或节点变化时，更新表单列表
  useEffect(() => {
    if (visible) {
      // 优先使用前端节点数据
      if (allNodes.length > 0) {
        const localForms = extractFormsFromNodes();
        setWorkflowForms(localForms);
      } else if (workflowDefinitionId) {
        // 如果没有前端节点数据，则从后端获取（编辑已保存的流程时）
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
    }
  }, [visible, workflowDefinitionId, allNodes, extractFormsFromNodes]);

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
                    <Select
                      disabled
                      options={Object.keys(NODE_CONFIGS).map(key => ({
                        label: intl.formatMessage({ id: `pages.workflow.designer.add${key.charAt(0).toUpperCase() + key.slice(1)}` }),
                        value: key
                      }))}
                    />
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
                        <Select
                          options={[
                            { label: intl.formatMessage({ id: 'pages.workflow.designer.approvalType.all' }), value: 0 },
                            { label: intl.formatMessage({ id: 'pages.workflow.designer.approvalType.any' }), value: 1 },
                            { label: intl.formatMessage({ id: 'pages.workflow.designer.approvalType.sequential' }), value: 2 }
                          ]}
                        />
                      </Form.Item>

                      <Divider titlePlacement="left" plain>审批人设置</Divider>
                      <Form.List name="approvers">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Card size="small" styles={{ body: { marginBottom: 12, background: '#f8fafc' } }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                                    <Select
                                      placeholder="审批方式"
                                      options={[
                                        { label: '指定用户', value: 0 },
                                        { label: '指定角色', value: 1 },
                                        { label: '表单字段', value: 3 }
                                      ]}
                                    />
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
                      <Divider titlePlacement="left" plain>条件分支</Divider>
                      <Form.List name="branches">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Card
                                size="small"
                                style={{ marginBottom: 12, background: '#f8fafc' }}
                                key={key}
                                extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}
                              >
                                <Space orientation="vertical" style={{ width: '100%' }}>
                                  {/* 分支标签 */}
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'label']}
                                    label="分支标签"
                                    rules={[{ required: true, message: '请输入分支标签' }]}
                                  >
                                    <Input placeholder="例如：金额 > 100" />
                                  </Form.Item>

                                  {/* 分支启用状态 */}
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'enabled']}
                                    label="启用此分支"
                                    valuePropName="checked"
                                  >
                                    <Switch />
                                  </Form.Item>

                                  {/* 分支内的条件规则 */}
                                  <Divider style={{ margin: '8px 0' }} plain>条件规则</Divider>
                                  <Form.List name={[name, 'conditions']}>
                                    {(condFields, { add: addCond, remove: removeCond }) => (
                                      <>
                                        {condFields.map(({ key: condKey, name: condName, ...condRestField }) => (
                                          <Card
                                            size="small"
                                            style={{ marginBottom: 8, background: '#ffffff', border: '1px solid #e5e7eb' }}
                                            key={condKey}
                                            extra={<DeleteOutlined onClick={() => removeCond(condName)} style={{ color: '#ff4d4f', fontSize: '12px' }} />}
                                          >
                                            <Space orientation="vertical" style={{ width: '100%' }}>
                                              {/* 表单选择 */}
                                              <Form.Item
                                                {...condRestField}
                                                name={[condName, 'formId']}
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

                                              {/* 字段选择 */}
                                              <Form.Item noStyle shouldUpdate={(prev, curr) => {
                                                const prevFormId = prev.branches?.[name]?.conditions?.[condName]?.formId;
                                                const currFormId = curr.branches?.[name]?.conditions?.[condName]?.formId;
                                                return prevFormId !== currFormId;
                                              }}>
                                                {({ getFieldValue }) => {
                                                  const formId = getFieldValue(['branches', name, 'conditions', condName, 'formId']);
                                                  const fields = getSelectedFormFields(formId);
                                                  return (
                                                    <Form.Item
                                                      {...condRestField}
                                                      name={[condName, 'variable']}
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

                                              {/* 操作符 */}
                                              <Form.Item
                                                {...condRestField}
                                                name={[condName, 'operator']}
                                                label="操作符"
                                                rules={[{ required: true, message: '请选择操作符' }]}
                                              >
                                                <Select
                                                  placeholder="选择操作符"
                                                  options={[
                                                    { label: '等于 (==)', value: 'equals' },
                                                    { label: '不等于 (!=)', value: 'not_equals' },
                                                    { label: '大于 (>)', value: 'greater_than' },
                                                    { label: '小于 (<)', value: 'less_than' },
                                                    { label: '大于等于 (>=)', value: 'greater_than_or_equal' },
                                                    { label: '小于等于 (<=)', value: 'less_than_or_equal' },
                                                    { label: '包含 (Contains)', value: 'contains' }
                                                  ]}
                                                />
                                              </Form.Item>

                                              {/* 比较值 */}
                                              <Form.Item
                                                {...condRestField}
                                                name={[condName, 'value']}
                                                label="比较值"
                                                rules={[{ required: true, message: '请输入比较值' }]}
                                              >
                                                <Input placeholder="输入值" />
                                              </Form.Item>
                                            </Space>
                                          </Card>
                                        ))}
                                        <Button type="dashed" onClick={() => addCond()} block size="small" icon={<PlusOutlined />}>
                                          添加条件
                                        </Button>
                                      </>
                                    )}
                                  </Form.List>

                                  {/* 分支内的逻辑运算符 */}
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'logicalOperator']}
                                    label="条件间逻辑"
                                  >
                                    <Select
                                      options={[
                                        { label: 'AND (且)', value: 'and' },
                                        { label: 'OR (或)', value: 'or' }
                                      ]}
                                    />
                                  </Form.Item>

                                  {/* 目标节点 */}
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'targetNodeId']}
                                    label="目标节点"
                                    rules={[{ required: true, message: '请选择目标节点' }]}
                                  >
                                    <Select
                                      placeholder="选择此分支匹配时的下一个节点"
                                      options={allNodes
                                        .filter(node => node && node.id !== selectedNode?.id)
                                        .map(node => ({
                                          label: node.data?.label || node.id,
                                          value: node.id
                                        }))}
                                    />
                                  </Form.Item>
                                </Space>
                              </Card>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              添加分支
                            </Button>
                          </>
                        )}
                      </Form.List>

                      {/* 默认分支 */}
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => {
                        const prevBranches = prevValues.branches || [];
                        const currBranches = currentValues.branches || [];
                        return prevBranches.length !== currBranches.length ||
                          prevBranches.some((b: any, i: number) => b?.id !== currBranches[i]?.id || b?.label !== currBranches[i]?.label);
                      }}>
                        {({ getFieldValue }) => {
                          const branches = getFieldValue('branches') || [];
                          const validBranches = Array.isArray(branches) ? branches.filter((b: any) => b) : [];
                          const branchOptions: SelectProps['options'] = validBranches.map((branch: any, idx: number) => ({
                            label: branch?.label || `分支 ${idx + 1}`,
                            value: branch?.id || idx
                          }));
                          return (
                            <Form.Item
                              name="defaultBranchId"
                              label="默认分支"
                              tooltip="当所有条件都不匹配时，使用此分支"
                            >
                              <Select
                                placeholder="选择默认分支"
                                allowClear
                                options={branchOptions}
                              />
                            </Form.Item>
                          );
                        }}
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
