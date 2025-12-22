import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import 'd3-transition';
import { Button, Card, Drawer, Form, Input, Select, Switch, message, Space, Divider } from 'antd';
import { PlusOutlined, SaveOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  NodeConfig,
  ApprovalConfig,
  ConditionConfig,
  ApproverRule,
  ApproverType,
} from '@/services/workflow/api';
import { getUserList } from '@/services/user/api';
import { getAllRoles } from '@/services/role/api';
import type { AppUser } from '@/services/user/api';
import type { Role } from '@/services/role/api';

interface WorkflowDesignerProps {
  visible?: boolean;
  graph?: WorkflowGraph;
  onSave?: (graph: WorkflowGraph) => void;
  onClose?: () => void;
}

// nodeTypes 将在组件内部使用 intl 动态生成
const getNodeTypes = (intl: any) => ({
  start: {
    style: { background: '#52c41a', color: '#fff', border: '2px solid #389e0d' },
    label: intl.formatMessage({ id: 'pages.workflow.designer.addStart' }),
  },
  end: {
    style: { background: '#ff4d4f', color: '#fff', border: '2px solid #cf1322' },
    label: intl.formatMessage({ id: 'pages.workflow.designer.addEnd' }),
  },
  approval: {
    style: { background: '#1890ff', color: '#fff', border: '2px solid #096dd9' },
    label: intl.formatMessage({ id: 'pages.workflow.designer.addApproval' }),
  },
  condition: {
    style: { background: '#faad14', color: '#fff', border: '2px solid #d48806' },
    label: intl.formatMessage({ id: 'pages.workflow.designer.addCondition' }),
  },
  parallel: {
    style: { background: '#722ed1', color: '#fff', border: '2px solid #531dab' },
    label: intl.formatMessage({ id: 'pages.workflow.designer.addParallel' }),
  },
});

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  visible = false,
  graph,
  onSave,
  onClose,
}) => {
  const intl = useIntl();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configDrawerVisible, setConfigDrawerVisible] = useState(false);
  const [configForm] = Form.useForm();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // 加载用户和角色列表
  useEffect(() => {
    const loadData = async () => {
      setLoadingUsers(true);
      setLoadingRoles(true);
      try {
        const [usersResponse, rolesResponse] = await Promise.all([
          getUserList({ page: 1, pageSize: 100, isActive: true }),
          getAllRoles(),
        ]);
        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data.users);
        }
        if (rolesResponse.success && rolesResponse.data) {
          setRoles(rolesResponse.data.roles.filter((r) => r.isActive));
        }
      } catch (error) {
        console.error('加载用户或角色列表失败:', error);
      } finally {
        setLoadingUsers(false);
        setLoadingRoles(false);
      }
    };
    loadData();
  }, []);

  // 初始化节点和边
  React.useEffect(() => {
    if (graph) {
      const nodeTypesMap = getNodeTypes(intl);
      const initialNodes: Node[] = graph.nodes.map((node) => ({
        id: node.id,
        type: 'default',
        position: { x: node.position.x, y: node.position.y },
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {nodeTypesMap[node.type as keyof typeof nodeTypesMap]?.label || node.type}
              </div>
              <div style={{ fontSize: '12px' }}>{node.label || ''}</div>
            </div>
          ),
          nodeType: node.type,
          config: node.config,
        },
        style: {
          ...nodeTypesMap[node.type as keyof typeof nodeTypesMap]?.style,
          borderRadius: '8px',
          minWidth: '120px',
        },
      }));

      const initialEdges: Edge[] = graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        labelStyle: { fill: '#666', fontWeight: 600 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: {
          condition: edge.condition,
        },
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      // 默认创建一个开始节点
      const nodeTypesMap = getNodeTypes(intl);
      setNodes([
        {
          id: 'start-1',
          type: 'default',
          position: { x: 250, y: 100 },
          data: {
            label: (
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ fontWeight: 'bold' }}>{nodeTypesMap.start.label}</div>
              </div>
            ),
            nodeType: 'start',
            config: {},
          },
          style: {
            ...nodeTypesMap.start.style,
            borderRadius: '8px',
            minWidth: '120px',
          },
        },
      ]);
      setEdges([]);
    }
  }, [graph, setNodes, setEdges, intl]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge-${Date.now()}`,
        labelStyle: { fill: '#666', fontWeight: 600 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const addNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'default',
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {nodeTypes[type as keyof typeof nodeTypes]?.label || type}
              </div>
            </div>
          ),
          nodeType: type,
          config: {},
        },
        style: {
          ...nodeTypes[type as keyof typeof nodeTypes]?.style,
          borderRadius: '8px',
          minWidth: '120px',
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setConfigDrawerVisible(true);
    const config = node.data.config || {};
    
    // 提取节点标签文本
    let labelText = '';
    try {
      const labelElement = node.data.label;
      if (labelElement && typeof labelElement === 'object' && 'props' in labelElement) {
        const children = labelElement.props?.children;
        if (Array.isArray(children) && children.length > 1) {
          const secondChild = children[1];
          if (secondChild && typeof secondChild === 'object' && 'props' in secondChild) {
            labelText = secondChild.props?.children || '';
          }
        }
      }
    } catch (e) {
      // 如果提取失败，使用空字符串
    }
    
    // 处理审批人规则，转换为表单格式
    const approversForForm = (config.approval?.approvers || []).map((rule: ApproverRule) => {
      if (rule.type === ApproverType.User) {
        return {
          type: 0,
          userId: rule.userId,
          roleId: undefined,
        };
      } else if (rule.type === ApproverType.Role) {
        return {
          type: 1,
          userId: undefined,
          roleId: rule.roleId,
        };
      }
      return rule;
    });
    
    configForm.setFieldsValue({
      label: labelText,
      nodeType: node.data.nodeType,
      approvalType: config.approval?.type,
      approvers: approversForForm,
      allowDelegate: config.approval?.allowDelegate,
      allowReject: config.approval?.allowReject,
      allowReturn: config.approval?.allowReturn,
      timeoutHours: config.approval?.timeoutHours,
      expression: config.condition?.expression,
    });
  }, [configForm]);

  const handleSaveConfig = useCallback(() => {
    if (!selectedNode) return;

    configForm.validateFields().then((values) => {
      const updatedNodes = nodes.map((node) => {
        if (node.id === selectedNode.id) {
          const config: NodeConfig = {};
          
          if (values.nodeType === 'approval') {
            // 处理审批人规则，确保格式正确
            const approvers: ApproverRule[] = (values.approvers || []).map((rule: any) => {
              if (rule.type === 0) {
                // 用户类型
                return {
                  type: ApproverType.User,
                  userId: rule.userId,
                  roleId: undefined,
                  departmentId: undefined,
                };
              } else if (rule.type === 1) {
                // 角色类型
                return {
                  type: ApproverType.Role,
                  userId: undefined,
                  roleId: rule.roleId,
                  departmentId: undefined,
                };
              }
              return rule;
            });
            
            config.approval = {
              type: values.approvalType || 0,
              approvers: approvers,
              allowDelegate: values.allowDelegate || false,
              allowReject: values.allowReject !== false,
              allowReturn: values.allowReturn || false,
              timeoutHours: values.timeoutHours,
            };
          } else if (values.nodeType === 'condition') {
            config.condition = {
              expression: values.expression || '',
            };
          }

          return {
            ...node,
            data: {
              ...node.data,
              label: (
                <div style={{ textAlign: 'center', padding: '8px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {nodeTypes[values.nodeType as keyof typeof nodeTypes]?.label || values.nodeType}
                  </div>
                  <div style={{ fontSize: '12px' }}>{values.label || ''}</div>
                </div>
              ),
              nodeType: values.nodeType,
              config,
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      setConfigDrawerVisible(false);
      message.success(intl.formatMessage({ id: 'pages.workflow.designer.message.configSaved' }));
    });
  }, [selectedNode, configForm, nodes, setNodes, intl]);

  const validateWorkflow = useCallback(() => {
    const startNodes = nodes.filter((n) => n.data.nodeType === 'start');
    const endNodes = nodes.filter((n) => n.data.nodeType === 'end');

    if (startNodes.length === 0) {
      message.error(intl.formatMessage({ id: 'pages.workflow.designer.message.noStartNode' }));
      return false;
    }

    if (endNodes.length === 0) {
      message.error(intl.formatMessage({ id: 'pages.workflow.designer.message.noEndNode' }));
      return false;
    }

    // 检查所有节点是否连通
    const nodeIds = new Set(nodes.map((n) => n.id));
    const connectedNodes = new Set<string>();
    
    const dfs = (nodeId: string) => {
      if (connectedNodes.has(nodeId)) return;
      connectedNodes.add(nodeId);
      edges.forEach((edge) => {
        if (edge.source === nodeId) {
          dfs(edge.target);
        }
      });
    };

    startNodes.forEach((node) => dfs(node.id));

    if (connectedNodes.size !== nodeIds.size) {
      message.warning(intl.formatMessage({ id: 'pages.workflow.designer.message.disconnectedNodes' }));
    }

    return true;
  }, [nodes, edges, intl]);

  const handleSave = useCallback(() => {
    if (!validateWorkflow()) {
      return;
    }

    const workflowGraph: WorkflowGraph = {
      nodes: nodes.map((node) => {
        // 提取节点标签文本
        let labelText = '';
        try {
          const labelElement = node.data.label;
          if (labelElement && typeof labelElement === 'object' && 'props' in labelElement) {
            const children = labelElement.props?.children;
            if (Array.isArray(children) && children.length > 1) {
              const secondChild = children[1];
              if (secondChild && typeof secondChild === 'object' && 'props' in secondChild) {
                labelText = secondChild.props?.children || '';
              }
            }
          }
        } catch (e) {
          // 如果提取失败，使用空字符串
        }
        
        return {
          id: node.id,
          type: node.data.nodeType as 'start' | 'end' | 'approval' | 'condition' | 'parallel',
          label: labelText,
          position: {
            x: node.position.x,
            y: node.position.y,
          },
          config: node.data.config || {},
        };
      }),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label as string,
        condition: edge.data?.condition,
      })),
    };

    onSave?.(workflowGraph);
  }, [nodes, edges, validateWorkflow, onSave]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '12px' }}
      >
        <Space>
          <Button
            icon={<PlusOutlined />}
            onClick={() => addNode('start')}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.workflow.designer.addStart' })}
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => addNode('approval')}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.workflow.designer.addApproval' })}
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => addNode('condition')}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.workflow.designer.addCondition' })}
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => addNode('parallel')}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.workflow.designer.addParallel' })}
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => addNode('end')}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.workflow.designer.addEnd' })}
          </Button>
          <Divider type="vertical" />
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.workflow.designer.save' })}
          </Button>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={validateWorkflow}
            size="small"
          >
            {intl.formatMessage({ id: 'pages.workflow.designer.validate' })}
          </Button>
        </Space>
      </Card>

      <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: '4px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <Drawer
        title={intl.formatMessage({ id: 'pages.workflow.designer.nodeConfig' })}
        open={configDrawerVisible}
        onClose={() => setConfigDrawerVisible(false)}
        width={400}
      >
        <Form form={configForm} layout="vertical">
          <Form.Item name="nodeType" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeType' })}>
            <Select disabled>
              <Select.Option value="start">{intl.formatMessage({ id: 'pages.workflow.designer.addStart' })}</Select.Option>
              <Select.Option value="end">{intl.formatMessage({ id: 'pages.workflow.designer.addEnd' })}</Select.Option>
              <Select.Option value="approval">{intl.formatMessage({ id: 'pages.workflow.designer.addApproval' })}</Select.Option>
              <Select.Option value="condition">{intl.formatMessage({ id: 'pages.workflow.designer.addCondition' })}</Select.Option>
              <Select.Option value="parallel">{intl.formatMessage({ id: 'pages.workflow.designer.addParallel' })}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="label" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })} />
          </Form.Item>

          {selectedNode?.data.nodeType === 'approval' && (
            <>
              <Form.Item name="approvalType" label={intl.formatMessage({ id: 'pages.workflow.designer.approvalType' })}>
                <Select>
                  <Select.Option value={0}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.all' })}</Select.Option>
                  <Select.Option value={1}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.any' })}</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="approvers"
                label={intl.formatMessage({ id: 'pages.workflow.designer.approverRules' })}
                rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.designer.approverRules' }) }]}
              >
                <Form.List name="approvers">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'type']}
                            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.designer.approverType' }) }]}
                          >
                            <Select style={{ width: 100 }} placeholder={intl.formatMessage({ id: 'pages.workflow.designer.approverType' })}>
                              <Select.Option value={0}>{intl.formatMessage({ id: 'pages.workflow.designer.approverType.user' })}</Select.Option>
                              <Select.Option value={1}>{intl.formatMessage({ id: 'pages.workflow.designer.approverType.role' })}</Select.Option>
                            </Select>
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'userId']}
                            noStyle
                            shouldUpdate={(prevValues, curValues) =>
                              prevValues.approvers?.[name]?.type !== curValues.approvers?.[name]?.type
                            }
                          >
                            {({ getFieldValue }) => {
                              const approverType = getFieldValue(['approvers', name, 'type']);
                              if (approverType === 0) {
                                return (
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'userId']}
                                    rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.designer.selectUser' }) }]}
                                  >
                                    <Select
                                      style={{ width: 200 }}
                                      placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectUser' })}
                                      loading={loadingUsers}
                                      showSearch
                                      filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                      }
                                    >
                                      {users.map((user) => (
                                        <Select.Option key={user.id} value={user.id} label={user.username}>
                                          {user.username}
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  </Form.Item>
                                );
                              }
                              if (approverType === 1) {
                                return (
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'roleId']}
                                    rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.designer.selectRole' }) }]}
                                  >
                                    <Select
                                      style={{ width: 200 }}
                                      placeholder={intl.formatMessage({ id: 'pages.workflow.designer.selectRole' })}
                                      loading={loadingRoles}
                                      showSearch
                                      filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                      }
                                    >
                                      {roles.map((role) => (
                                        <Select.Option key={role.id} value={role.id} label={role.name}>
                                          {role.name}
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  </Form.Item>
                                );
                              }
                              return null;
                            }}
                          </Form.Item>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          >
                            {intl.formatMessage({ id: 'pages.button.delete' })}
                          </Button>
                        </Space>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          {intl.formatMessage({ id: 'pages.workflow.designer.addApproverRule' })}
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              </Form.Item>
              <Form.Item name="allowDelegate" valuePropName="checked">
                <Switch
                  checkedChildren={intl.formatMessage({ id: 'pages.workflow.designer.allowDelegate' })}
                  unCheckedChildren={intl.formatMessage({ id: 'pages.workflow.designer.notAllowDelegate' })}
                />
              </Form.Item>
              <Form.Item name="allowReject" valuePropName="checked">
                <Switch
                  checkedChildren={intl.formatMessage({ id: 'pages.workflow.designer.allowReject' })}
                  unCheckedChildren={intl.formatMessage({ id: 'pages.workflow.designer.notAllowReject' })}
                />
              </Form.Item>
              <Form.Item name="allowReturn" valuePropName="checked">
                <Switch
                  checkedChildren={intl.formatMessage({ id: 'pages.workflow.designer.allowReturn' })}
                  unCheckedChildren={intl.formatMessage({ id: 'pages.workflow.designer.notAllowReturn' })}
                />
              </Form.Item>
            </>
          )}

          {selectedNode?.data.nodeType === 'condition' && (
            <Form.Item name="expression" label={intl.formatMessage({ id: 'pages.workflow.designer.conditionExpression' })}>
              <Input.TextArea
                placeholder={intl.formatMessage({ id: 'pages.workflow.designer.conditionExpressionPlaceholder' })}
                rows={3}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" onClick={handleSaveConfig} block>
              {intl.formatMessage({ id: 'pages.button.save' })}
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default WorkflowDesigner;
