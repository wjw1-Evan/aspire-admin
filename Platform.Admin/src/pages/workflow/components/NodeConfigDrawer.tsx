import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Input, Select, Switch, Space, Divider, Tabs, FormInstance, TreeSelect, Radio } from 'antd';
import { Drawer } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { DeleteOutlined, SaveOutlined, PlusOutlined, InfoCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { NODE_CONFIGS } from './WorkflowDesignerConstants';
import { Node } from 'reactflow';
import type { AppUser } from '@/services/user/api';
import type { Role } from '@/services/role/api';
import type { FormDefinition as ApiFormDefinition } from '@/services/form/api';
import type { FormDefinition } from '@/pages/workflow/forms/types';
import { getWorkflowFormsAndFields, getOrganizationTree, type OrganizationTreeNode } from '@/services/workflow/api';
import FormDesignerDialog from './FormDesignerDialog';
import { FormTarget } from '@/services/workflow/api';
import type { SelectProps } from 'antd';
import type { DataNode } from 'antd/es/tree';

interface WorkflowFormField {
  id: string;
  label: string;
  dataKey: string;
  type: string;
  required: boolean;
}

interface WorkflowForm {
  id: string;
  name: string;
  key: string;
  fields: WorkflowFormField[];
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
  forms: ApiFormDefinition[];
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
  const [organizationTree, setOrganizationTree] = useState<OrganizationTreeNode[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [currentApproverIndex, setCurrentApproverIndex] = useState<number | null>(null);
  const [formDesignerVisible, setFormDesignerVisible] = useState(false);
  const [formDesignerEditingForm, setFormDesignerEditingForm] = useState<FormDefinition | null>(null);

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
            id: formDef.id || 'unknown',
            name: formDef.name || '',
            key: formDef.key || '',
            fields: (formDef.fields || []).map(field => ({
              id: field.id || 'unknown',
              label: field.label || '',
              dataKey: field.dataKey || '',
              type: field.type,
              required: field.required || false,
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

      // 加载组织架构树
      setLoadingOrgs(true);
      getOrganizationTree()
        .then(response => {
          if (response.data) {
            setOrganizationTree(response.data);
          }
        })
        .catch(error => {
          console.error('加载组织架构失败:', error);
        })
        .finally(() => {
          setLoadingOrgs(false);
        });
    }
  }, [visible, workflowDefinitionId, allNodes, extractFormsFromNodes]);

  const getSelectedFormFields = (formId: string | undefined): WorkflowFormField[] => {
    if (!formId) return [];
    const boundForm = workflowForms.find(f => f.id === formId);
    if (boundForm?.fields?.length) return boundForm.fields;
    const formDef = forms.find(f => f.id === formId);
    if (!formDef?.fields?.length) return [];
    return formDef.fields.map(field => ({
      id: field.id || 'unknown',
      label: field.label || '',
      dataKey: field.dataKey || '',
      type: field.type,
      required: field.required || false,
    }));
  };

  const getFormFieldsPreview = (formId: string | undefined) => {
    const fields = getSelectedFormFields(formId);
    if (!fields.length) return null;
    return (
      <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 6, fontSize: 12 }}>
        <div style={{ fontWeight: 500, marginBottom: 6, color: '#595959' }}>表单字段 ({fields.length})</div>
        {fields.map(f => (
          <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #e8e8e8' }}>
            <span style={{ color: '#262626' }}>{f.label}</span>
            <span style={{ color: '#8c8c8c' }}>({f.dataKey})</span>
            <span style={{ color: '#bfbfbf', fontSize: 11 }}>{f.type}</span>
            {f.required && <span style={{ color: '#ff4d4f' }}>*</span>}
          </div>
        ))}
      </div>
    );
  };

  const handleOpenFormDesigner = (form?: ApiFormDefinition | null) => {
    setFormDesignerEditingForm(form as unknown as FormDefinition | null);
    setFormDesignerVisible(true);
  };

  const handleFormDesignerSuccess = (form: FormDefinition) => {
    setFormDesignerVisible(false);
    setFormDesignerEditingForm(null);
    configForm.setFieldsValue({ formDefinitionId: form.id });
  };

  // 转换组织树为 Ant Design TreeSelect 格式
  const organizationTreeToTreeData = (nodes: OrganizationTreeNode[]): DataNode[] => {
    return nodes.map(node => ({
      title: node.name,
      key: node.id,
      value: node.id,
      children: node.children?.length > 0 ? organizationTreeToTreeData(node.children) : undefined,
    }));
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
              label: intl.formatMessage({ id: 'pages.workflow.designer.basicInfo' }),
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

                  {selectedNode?.data.nodeType !== 'end' && selectedNode?.data.nodeType !== 'approval' && (
                    <Form.Item name="nextNodeId" label={intl.formatMessage({ id: 'pages.workflow.designer.nextNode' })}>
                      <Select
                        placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectNextNode' })}
                        allowClear
                        options={allNodes
                          .filter(n => n.id !== selectedNode?.id)
                          .map(n => ({
                            label: `${n.data?.label || n.id} (${intl.formatMessage({ id: `pages.workflow.designer.nodeType.${n.data?.nodeType}` })})`,
                            value: n.id
                          }))}
                      />
                    </Form.Item>
                  )}

                  {selectedNode?.data.nodeType === 'approval' && (
                    <>
                      <Form.Item name="approveNextNodeId" label={intl.formatMessage({ id: 'pages.workflow.designer.approveNextNode' })}>
                        <Select
                          placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectApproveNextNode' })}
                          allowClear
                          options={allNodes
                            .filter(n => n.id !== selectedNode?.id)
                            .map(n => ({
                              label: `${n.data?.label || n.id} (${intl.formatMessage({ id: `pages.workflow.designer.nodeType.${n.data?.nodeType}` })})`,
                              value: n.id
                            }))}
                        />
                      </Form.Item>
                      <Form.Item name="rejectNextNodeId" label={intl.formatMessage({ id: 'pages.workflow.designer.rejectNextNode' })}>
                        <Select
                          placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectRejectNextNode' })}
                          allowClear
                          options={allNodes
                            .filter(n => n.id !== selectedNode?.id)
                            .map(n => ({
                              label: `${n.data?.label || n.id} (${intl.formatMessage({ id: `pages.workflow.designer.nodeType.${n.data?.nodeType}` })})`,
                              value: n.id
                            }))}
                        />
                      </Form.Item>
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'business',
              label: intl.formatMessage({ id: 'pages.workflow.designer.businessRules' }),
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

                      <Divider plain>{intl.formatMessage({ id: 'pages.workflow.designer.approverSettings' })}</Divider>
                      <Form.List name="approvers">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <ProCard size="small" style={{ marginBottom: 12, background: '#f8fafc' }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                                    <Select
                                      placeholder={intl.formatMessage({ id: 'pages.workflow.designer.approvalMethod' })}
                                       options={[
                                         { label: intl.formatMessage({ id: 'pages.workflow.designer.specifiedUser' }), value: 0 },
                                         { label: intl.formatMessage({ id: 'pages.workflow.designer.specifiedRole' }), value: 1 },
                                         { label: intl.formatMessage({ id: 'pages.workflow.designer.specifiedDepartment' }), value: 2 },
                                         { label: intl.formatMessage({ id: 'pages.workflow.designer.formField' }), value: 3 },
                                         { label: intl.formatMessage({ id: 'pages.workflow.designer.supervisor' }), value: 4 }
                                       ]}
                                    />
                                  </Form.Item>
                                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.approvers?.[name]?.type !== curr.approvers?.[name]?.type}>
                                      {({ getFieldValue }) => {
                                       const type = getFieldValue(['approvers', name, 'type']);
                                       if (type === 0) return <Form.Item {...restField} name={[name, 'userIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectUser' })} options={users.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>;
                                       if (type === 1) return <Form.Item {...restField} name={[name, 'roleIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectRole' })} options={roles.map(r => ({ label: r.name, value: r.id }))} /></Form.Item>;
if (type === 2) return (
                                         <Form.Item {...restField} name={[name, 'departmentId']} rules={[{ required: true }]}>
                                           <TreeSelect
                                             placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectDepartment' })}
                                             showSearch
                                             treeDefaultExpandAll
                                             treeData={organizationTreeToTreeData(organizationTree)}
                                             treeNodeFilterProp="title"
                                           />
                                        </Form.Item>
                                      );
if (type === 3) return (
                                         <Form.Item {...restField} name={[name, 'formFieldKey']} rules={[{ required: true }]}>
                                           <Select
                                             placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectFormField' })}
                                            showSearch
                                            options={availableVariables.map(v => ({ label: v.label, value: v.value }))}
                                          />
                                        </Form.Item>
                                      );
if (type === 4) return (
                                         <Form.Item {...restField} name={[name, 'supervisorLevel']} rules={[{ required: true }]}>
                                           <Select
                                             placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectSupervisorLevel' })}
                                             options={[
                                               { label: intl.formatMessage({ id: 'pages.workflow.designer.supervisorLevel1' }), value: 1 },
                                               { label: intl.formatMessage({ id: 'pages.workflow.designer.supervisorLevel2' }), value: 2 },
                                               { label: intl.formatMessage({ id: 'pages.workflow.designer.supervisorLevel3' }), value: 3 },
                                               { label: intl.formatMessage({ id: 'pages.workflow.designer.supervisorLevel4' }), value: 4 }
                                             ]}
                                           />
                                         </Form.Item>
                                       );
                                      return null;
                                    }}
                                  </Form.Item>
                                </div>
                              </ProCard>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>{intl.formatMessage({ id: 'pages.workflow.designer.addApprover' })}</Button>
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
                              <ProCard
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

                                  {/* 分支内的条件规则 */}
                                  <Divider style={{ margin: '8px 0' }} plain>条件规则</Divider>
                                  <Form.List name={[name, 'conditions']}>
                                    {(condFields, { add: addCond, remove: removeCond }) => (
                                      <>
                                        {condFields.map(({ key: condKey, name: condName, ...condRestField }) => (
                                          <ProCard
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
                                                    placeholder="选择表单"
                                                    showSearch
                                                    loading={loading}
                                                    options={forms.map(f => ({ label: f.name, value: f.id }))}
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
                                                          label: `${f.label} (${f.dataKey})`,
                                                          value: f.dataKey
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
                                          </ProCard>
                                        ))}
                                        <Button type="dashed" onClick={() => addCond()} block size="small" icon={<PlusOutlined />}>
                                          添加条件
                                        </Button>
                                      </>
                                    )}
                                  </Form.List>

                                  {/* 分支内的逻辑运算符 - 仅在有多个条件时显示 */}
                                  <Form.Item noStyle shouldUpdate={(prev, curr) => {
                                    const prevConds = prev.branches?.[name]?.conditions || [];
                                    const currConds = curr.branches?.[name]?.conditions || [];
                                    return prevConds.length !== currConds.length;
                                  }}>
                                    {({ getFieldValue }) => {
                                      const conditions = getFieldValue(['branches', name, 'conditions']) || [];
                                      return conditions.length > 1 ? (
                                        <Form.Item
                                          {...restField}
                                          name={[name, 'logicalOperator']}
                                          label="条件间逻辑"
                                          rules={[{ required: true, message: '请选择条件间逻辑' }]}
                                        >
                                          <Select
                                            placeholder="选择多个条件之间的逻辑关系"
                                            options={[
                                              { label: 'AND (且)', value: 'and' },
                                              { label: 'OR (或)', value: 'or' }
                                            ]}
                                          />
                                        </Form.Item>
                                      ) : null;
                                    }}
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
                              </ProCard>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              添加分支
                            </Button>
                          </>
                        )}
                      </Form.List>

                      {/* 默认节点 */}
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => {
                        const prevBranches = prevValues.branches || [];
                        const currBranches = currentValues.branches || [];
                        return prevBranches.length !== currBranches.length ||
                          prevBranches.some((b: any, i: number) => b?.id !== currBranches[i]?.id || b?.label !== currBranches[i]?.label);
                      }}>
                        {({ getFieldValue }) => {
                          const nodeOptions: SelectProps['options'] = allNodes
                            .filter(node => node && node.id !== selectedNode?.id)
                            .map(node => ({
                              label: node.data?.label || node.id,
                              value: node.id
                            }));
                          return (
                             <Form.Item
                               name="defaultNodeId"
                               label={intl.formatMessage({ id: 'pages.flow.node.defaultNode' })}
                               tooltip={intl.formatMessage({ id: 'pages.flow.node.defaultNodeTooltip' })}
                             >
                               <Select
                                 placeholder={intl.formatMessage({ id: 'pages.flow.node.selectDefaultNode' })}
                                 allowClear
                                 options={nodeOptions}
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
               label: intl.formatMessage({ id: 'pages.flow.node.advancedSettings' }),
               children: (
                <>
                  {selectedNode?.data.nodeType === 'approval' && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                       <Form.Item name="allowDelegate" label={intl.formatMessage({ id: 'pages.flow.node.allowDelegate' })} valuePropName="checked"><Switch /></Form.Item>
                       <Form.Item name="allowReject" label={intl.formatMessage({ id: 'pages.flow.node.allowReject' })} valuePropName="checked"><Switch /></Form.Item>
                       <Form.Item name="allowReturn" label={intl.formatMessage({ id: 'pages.flow.node.allowReturn' })} valuePropName="checked"><Switch /></Form.Item>
                       <Form.Item name="timeoutHours" label={intl.formatMessage({ id: 'pages.flow.node.timeoutHours' })}><Input type="number" /></Form.Item>

                       <Divider titlePlacement="left" plain>{intl.formatMessage({ id: 'pages.flow.node.ccRules' })}</Divider>
                      <Form.List name="ccRules">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <ProCard size="small" style={{ marginBottom: 8, background: '#f8fafc' }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]}>
                                    <Select
                                       placeholder={intl.formatMessage({ id: 'pages.flow.node.ccType' })}
                                       options={[
                                         { label: intl.formatMessage({ id: 'pages.flow.node.specifyUser' }), value: 0 },
                                         { label: intl.formatMessage({ id: 'pages.flow.node.specifyRole' }), value: 1 },
                                         { label: intl.formatMessage({ id: 'pages.flow.node.specifyDepartment' }), value: 2 }
                                       ]}
                                    />
                                  </Form.Item>
                                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.ccRules?.[name]?.type !== curr.ccRules?.[name]?.type}>
                                    {({ getFieldValue }) => {
                                      const type = getFieldValue(['ccRules', name, 'type']);
                                       if (type === 0) return <Form.Item {...restField} name={[name, 'userIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder={intl.formatMessage({ id: 'pages.flow.node.selectUser' })} options={users.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>;
                                       if (type === 1) return <Form.Item {...restField} name={[name, 'roleIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder={intl.formatMessage({ id: 'pages.flow.node.selectRole' })} options={roles.map(r => ({ label: r.name, value: r.id }))} /></Form.Item>;
                                       if (type === 2) return <Form.Item {...restField} name={[name, 'departmentId']} rules={[{ required: true }]}><TreeSelect placeholder={intl.formatMessage({ id: 'pages.flow.node.selectDepartment' })} showSearch treeDefaultExpandAll treeNodeFilterProp="title" treeData={organizationTreeToTreeData(organizationTree)} /></Form.Item>;
                                      return null;
                                    }}
                                  </Form.Item>
                                </div>
                              </ProCard>
                            ))}
                             <Button type="dashed" onClick={() => add()} block size="small" icon={<PlusOutlined />}>{intl.formatMessage({ id: 'pages.flow.node.addCcRule' })}</Button>
                          </>
                        )}
                      </Form.List>
                    </div>
                  )}
                   {selectedNode?.data.nodeType === 'start' && (
                       <Form.Item name="formDefinitionId" label={intl.formatMessage({ id: 'pages.flow.node.bindStartForm' })}>
                         <Select placeholder={intl.formatMessage({ id: 'pages.flow.node.selectStartForm' })} allowClear options={forms.map(f => ({ label: f.name, value: f.id }))} />
                       </Form.Item>
                     )}
                     {selectedNode?.data.nodeType === 'start' && (
                       <Form.Item noStyle shouldUpdate={(prev, curr) => prev.formDefinitionId !== curr.formDefinitionId}>
                         {({ getFieldValue }) => {
                           const fid = getFieldValue('formDefinitionId');
                           if (!fid) return null;
                           return (
                             <>
                               <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                 <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenFormDesigner(forms.find(f => f.id === fid))}>编辑表单</Button>
                                 <Button size="small" icon={<PlusOutlined />} onClick={() => handleOpenFormDesigner(null)}>新建表单</Button>
                               </div>
                               {getFormFieldsPreview(fid)}
                             </>
                           );
                         }}
                       </Form.Item>
                     )}
                    {selectedNode?.data.nodeType === 'approval' && (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                         <Form.Item name="formDefinitionId" label={intl.formatMessage({ id: 'pages.flow.node.bindForm' })}>
                           <Select placeholder={intl.formatMessage({ id: 'pages.flow.node.selectForm' })} allowClear options={forms.map(f => ({ label: f.name, value: f.id }))} />
                         </Form.Item>
                         <Form.Item noStyle shouldUpdate={(prev, curr) => prev.formDefinitionId !== curr.formDefinitionId}>
                           {({ getFieldValue }) => {
                             const formId = getFieldValue('formDefinitionId');
                             return (
                               <>
                                 {formId && (
                                   <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                     <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenFormDesigner(forms.find(f => f.id === formId))}>编辑表单</Button>
                                     <Button size="small" icon={<PlusOutlined />} onClick={() => handleOpenFormDesigner(null)}>新建表单</Button>
                                   </div>
                                 )}
                                 {getFormFieldsPreview(formId)}
                                 {formId && (
                                   <>
                                     <Form.Item name="formTarget" label={intl.formatMessage({ id: 'pages.flow.node.formTarget' })} initialValue={FormTarget.Document}>
                                       <Radio.Group>
                                         <Radio value={FormTarget.Document}>{intl.formatMessage({ id: 'pages.flow.node.formTarget.document' })}</Radio>
                                         <Radio value={FormTarget.Instance}>{intl.formatMessage({ id: 'pages.flow.node.formTarget.instance' })}</Radio>
                                       </Radio.Group>
                                     </Form.Item>
                                     <Form.Item name="formReadOnly" label={intl.formatMessage({ id: 'pages.flow.node.formReadOnly' })} valuePropName="checked">
                                       <Switch />
                                     </Form.Item>
                                   </>
                                 )}
                               </>
                             );
                           }}
                         </Form.Item>
                       </div>
                    )}
                </>
              ),
            },
          ]}
        />
      </Form>

      <FormDesignerDialog
        visible={formDesignerVisible}
        editingForm={formDesignerEditingForm}
        onClose={() => { setFormDesignerVisible(false); setFormDesignerEditingForm(null); }}
        onSuccess={handleFormDesignerSuccess}
      />
    </Drawer>
  );
};

export default NodeConfigDrawer;
