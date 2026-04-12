import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Input, Select, Switch, Space, Divider, Tabs, FormInstance, Tree, TreeSelect } from 'antd';
import { Drawer } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { DeleteOutlined, SaveOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { NODE_CONFIGS } from './WorkflowDesignerConstants';
import { Node } from 'reactflow';
import type { AppUser } from '@/services/user/api';
import type { Role } from '@/services/role/api';
import type { FormDefinition } from '@/services/form/api';
import { getWorkflowFormsAndFields, getOrganizationTree, type OrganizationTreeNode } from '@/services/workflow/api';
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
  const [organizationTree, setOrganizationTree] = useState<OrganizationTreeNode[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [currentApproverIndex, setCurrentApproverIndex] = useState<number | null>(null);

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

  // 获取选中表单的字段
  const getSelectedFormFields = (formId: string | undefined): WorkflowFormField[] => {
    if (!formId) return [];
    const form = workflowForms.find(f => f.id === formId);
    return form?.fields || [];
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
                              <ProCard size="small" style={{ marginBottom: 12, background: '#f8fafc' }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                                    <Select
                                      placeholder="审批方式"
                                      options={[
                                        { label: '指定用户', value: 0 },
                                        { label: '指定角色', value: 1 },
                                        { label: '指定部门', value: 2 },
                                        { label: '表单字段', value: 3 },
                                        { label: '主管', value: 4 }
                                      ]}
                                    />
                                  </Form.Item>
                                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.approvers?.[name]?.type !== curr.approvers?.[name]?.type}>
                                    {({ getFieldValue }) => {
                                      const type = getFieldValue(['approvers', name, 'type']);
                                      if (type === 0) return <Form.Item {...restField} name={[name, 'userIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择用户" options={users.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>;
                                      if (type === 1) return <Form.Item {...restField} name={[name, 'roleIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择角色" options={roles.map(r => ({ label: r.name, value: r.id }))} /></Form.Item>;
                                      if (type === 2) return (
                                        <Form.Item {...restField} name={[name, 'departmentId']} rules={[{ required: true }]}>
                                          <Select
                                            placeholder="选择部门"
                                            showSearch
                                            {...({ treeDefaultExpandAll: true, treeData: organizationTreeToTreeData(organizationTree), treeNodeFilterProp: "title" } as any)}
                                          />
                                        </Form.Item>
                                      );
                                      if (type === 3) return (
                                        <Form.Item {...restField} name={[name, 'formFieldKey']} rules={[{ required: true }]}>
                                          <Select
                                            placeholder="选择表单字段"
                                            showSearch
                                            options={availableVariables.map(v => ({ label: v.label, value: v.value }))}
                                          />
                                        </Form.Item>
                                      );
                                      if (type === 4) return (
                                        <Form.Item {...restField} name={[name, 'supervisorLevel']} rules={[{ required: true }]}>
                                          <Select
                                            placeholder="选择主管级别"
                                            options={[
                                              { label: '直接主管 (1级)', value: 1 },
                                              { label: '部门经理 (2级)', value: 2 },
                                              { label: '总监 (3级)', value: 3 },
                                              { label: '副总 (4级)', value: 4 }
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
                                                  placeholder="选择流程中使用的表单"
                                                  showSearch
                                                  loading={loading}
                                                  options={workflowForms.map(f => ({ label: f.name, value: f.id }))}
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
                              label="默认节点"
                              tooltip="当所有条件都不匹配时，流程跳转到此节点"
                            >
                              <Select
                                placeholder="选择默认节点"
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
              label: '高级设置',
              children: (
                <>
                  {selectedNode?.data.nodeType === 'approval' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Form.Item name="allowDelegate" label="允许委托申请" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="allowReject" label="允许驳回" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="allowReturn" label="允许退回" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="timeoutHours" label="审批超时设置 (小时)"><Input type="number" /></Form.Item>

                      <Divider titlePlacement="left" plain>抄送规则 (CC)</Divider>
                      <Form.List name="ccRules">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <ProCard size="small" style={{ marginBottom: 8, background: '#f8fafc' }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]}>
                                    <Select
                                      placeholder="抄送类型"
                                      options={[
                                        { label: '指定用户', value: 0 },
                                        { label: '指定角色', value: 1 },
                                        { label: '指定部门', value: 2 }
                                      ]}
                                    />
                                  </Form.Item>
                                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.ccRules?.[name]?.type !== curr.ccRules?.[name]?.type}>
                                    {({ getFieldValue }) => {
                                      const type = getFieldValue(['ccRules', name, 'type']);
                                      if (type === 0) return <Form.Item {...restField} name={[name, 'userIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择用户" options={users.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>;
                                      if (type === 1) return <Form.Item {...restField} name={[name, 'roleIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择角色" options={roles.map(r => ({ label: r.name, value: r.id }))} /></Form.Item>;
                                      if (type === 2) return <Form.Item {...restField} name={[name, 'departmentId']} rules={[{ required: true }]}><TreeSelect placeholder="选择部门" showSearch treeDefaultExpandAll treeData={organizationTreeToTreeData(organizationTree)} /></Form.Item>;
                                      return null;
                                    }}
                                  </Form.Item>
                                </div>
                              </ProCard>
                            ))}
                            <Button type="dashed" onClick={() => add()} block size="small" icon={<PlusOutlined />}>添加抄送规则</Button>
                          </>
                        )}
                      </Form.List>
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
