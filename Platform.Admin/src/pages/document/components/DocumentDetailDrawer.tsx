/**
 * DocumentDetailDrawer - 文档详情抽屉
 */

import React, { useMemo } from 'react';
import { Drawer, Card, Descriptions, Tag, Steps } from 'antd';
import ReactFlow, { Background, Controls, MiniMap, type Edge as FlowEdge, type Node as FlowNode } from 'reactflow';
import 'reactflow/dist/style.css';
import { ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { FormFieldType, WorkflowStatus, ApprovalAction } from '@/services/workflow/api';
import { getStatusMeta, workflowStatusMap, approvalActionMap } from '@/utils/statusMaps';
import type { DocumentDetailDrawerProps, NodeFormData } from './types';

const DocumentDetailDrawer: React.FC<DocumentDetailDrawerProps> = ({
    open,
    onClose,
    detailData,
    workflowDef,
    formDef,
    formValues,
    nodeFormDef,
    nodeFormValues,
    nodeForms,
}) => {
    const intl = useIntl();

    // 流程图节点
    const graphNodes: FlowNode[] = useMemo(() => {
        if (!workflowDef?.graph?.nodes?.length) return [];

        const typeLabel = (type?: string) => {
            switch (type) {
                case 'start': return intl.formatMessage({ id: 'pages.workflow.node.start', defaultMessage: '开始' });
                case 'end': return intl.formatMessage({ id: 'pages.workflow.node.end', defaultMessage: '结束' });
                case 'approval': return intl.formatMessage({ id: 'pages.workflow.node.approval', defaultMessage: '审批' });
                case 'condition': return intl.formatMessage({ id: 'pages.workflow.node.condition', defaultMessage: '条件' });
                case 'parallel': return intl.formatMessage({ id: 'pages.workflow.node.parallel', defaultMessage: '并行' });
                default: return intl.formatMessage({ id: 'pages.workflow.node.unknown', defaultMessage: '节点' });
            }
        };

        const nodeStyles: Record<string, any> = {
            start: { background: '#f6ffed', border: '1px solid #b7eb8f', color: '#52c41a' },
            end: { background: '#fff1f0', border: '1px solid #ffa39e', color: '#ff4d4f' },
            approval: { background: '#e6f7ff', border: '1px solid #91d5ff', color: '#1890ff' },
            condition: { background: '#fff7e6', border: '1px solid #ffd591', color: '#fa8c16' },
            parallel: { background: '#f9f0ff', border: '1px solid #d3adf7', color: '#722ed1' },
        };

        const workflowInstance = detailData?.workflowInstance;

        return workflowDef.graph.nodes.map((node) => {
            const isCurrent = node.id === workflowInstance?.currentNodeId;
            const style = nodeStyles[node.type] || { background: '#fff', border: '1px solid #d9d9d9' };

            return {
                id: node.id,
                position: { x: node.position?.x || 0, y: node.position?.y || 0 },
                data: {
                    label: (
                        <div style={{ textAlign: 'center', padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', opacity: 0.8 }}>{typeLabel(node.type)}</div>
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>{node.label || node.id}</div>
                        </div>
                    ),
                },
                draggable: false,
                selectable: false,
                connectable: false,
                style: {
                    ...style,
                    borderRadius: 8,
                    boxShadow: isCurrent ? '0 0 10px rgba(24, 144, 255, 0.4)' : '0 2px 4px rgba(0,0,0,0.05)',
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? '#1890ff' : style.border?.split(' ')[2],
                    minWidth: 120,
                },
            };
        });
    }, [workflowDef, intl, detailData]);

    // 流程图边
    const graphEdges: FlowEdge[] = useMemo(() => {
        if (!workflowDef?.graph?.edges?.length) return [];
        return workflowDef.graph.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label || edge.condition,
            type: 'default',
            selectable: false,
        }));
    }, [workflowDef]);

    // 格式化表单值
    const formatFormValue = (raw: any, fieldType?: string) => {
        if (raw === undefined || raw === null || raw === '') return '-';
        switch (fieldType) {
            case FormFieldType.Date:
            case FormFieldType.DateTime:
                return dayjs(raw).isValid() ? dayjs(raw).format('YYYY-MM-DD HH:mm:ss') : String(raw);
            case FormFieldType.Checkbox:
                return Array.isArray(raw) ? raw.join(', ') : String(raw);
            case FormFieldType.Switch:
                return raw ? intl.formatMessage({ id: 'pages.boolean.yes', defaultMessage: '是' }) : intl.formatMessage({ id: 'pages.boolean.no', defaultMessage: '否' });
            default:
                return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
        }
    };

    if (!detailData) return null;

    const doc = detailData.document ?? detailData;
    const workflowInstance = detailData.workflowInstance ?? (doc as any)?.workflowInstance;
    const approvalHistory = detailData.approvalHistory ?? (doc as any)?.approvalHistory ?? workflowInstance?.approvalHistory ?? [];

    const typeLabel = (type?: string) => {
        switch (type) {
            case 'start': return intl.formatMessage({ id: 'pages.workflow.node.type.start', defaultMessage: '开始' });
            case 'end': return intl.formatMessage({ id: 'pages.workflow.node.type.end', defaultMessage: '结束' });
            case 'approval': return intl.formatMessage({ id: 'pages.workflow.node.type.approval', defaultMessage: '审批' });
            case 'form': return intl.formatMessage({ id: 'pages.workflow.node.type.form', defaultMessage: '表单' });
            case 'gateway': return intl.formatMessage({ id: 'pages.workflow.node.type.gateway', defaultMessage: '网关' });
            default: return type || intl.formatMessage({ id: 'pages.workflow.node.type.unknown', defaultMessage: '节点' });
        }
    };

    return (
        <Drawer
            title={intl.formatMessage({ id: 'pages.document.modal.detailTitle' })}
            open={open}
            onClose={onClose}
            size={800}
        >
            {/* 基本信息 */}
            <Card style={{ marginBottom: 16 }}>
                <Descriptions column={2} bordered>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.title' })}>
                        {(doc as any)?.title || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.type' })}>
                        {(doc as any)?.documentType || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.category' })}>
                        {(doc as any)?.category || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.workflowStatus' })}>
                        {(() => {
                            const statusMeta = getStatusMeta(intl, workflowInstance?.status as WorkflowStatus | null, workflowStatusMap);
                            return <Tag color={statusMeta.color}>{statusMeta.text}</Tag>;
                        })()}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.createdBy' })}>
                        {(doc as any)?.createdBy || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.createdAt' })}>
                        {(doc as any)?.createdAt ? dayjs((doc as any).createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* 内容 */}
            {(doc as any)?.content && (
                <Card title={intl.formatMessage({ id: 'pages.document.detail.content' })} style={{ marginTop: 16 }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{(doc as any).content}</div>
                </Card>
            )}

            {/* 表单数据 */}
            <Card title={intl.formatMessage({ id: 'pages.document.detail.formData', defaultMessage: '表单填写内容' })} style={{ marginTop: 16 }}>
                {formDef && formDef.fields?.length ? (
                    <Descriptions column={1} bordered>
                        {formDef.fields.map((f) => {
                            const raw = formValues ? formValues[f.dataKey] : undefined;
                            return (
                                <Descriptions.Item key={f.dataKey} label={f.label || f.dataKey}>
                                    {formatFormValue(raw, f.type)}
                                </Descriptions.Item>
                            );
                        })}
                    </Descriptions>
                ) : (
                    <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 8, minHeight: 80, whiteSpace: 'pre-wrap' }}>
                        {(doc as any)?.formData && Object.keys((doc as any).formData).length > 0
                            ? JSON.stringify((doc as any).formData, null, 2)
                            : intl.formatMessage({ id: 'pages.document.detail.formData.empty', defaultMessage: '暂无表单数据' })}
                    </pre>
                )}
            </Card>

            {/* 流程信息 */}
            {workflowInstance && (
                <Card title={intl.formatMessage({ id: 'pages.document.detail.workflowInfo' })} style={{ marginTop: 16 }}>
                    <Descriptions column={1}>
                        <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.workflowStatus' })}>
                            {(() => {
                                const statusMeta = getStatusMeta(intl, workflowInstance?.status as WorkflowStatus | null, workflowStatusMap);
                                return <Tag color={statusMeta.color}>{statusMeta.text}</Tag>;
                            })()}
                        </Descriptions.Item>
                        <Descriptions.Item label={intl.formatMessage({ id: 'pages.workflow.monitor.progress.currentNode' })}>
                            {(() => {
                                const currentId = workflowInstance.currentNodeId;
                                const nodeMeta = workflowDef?.graph?.nodes?.find((n) => n.id === currentId);
                                const label = nodeMeta?.label || currentId;
                                return `${label} (${typeLabel(nodeMeta?.type)}/${currentId})`;
                            })()}
                        </Descriptions.Item>
                    </Descriptions>

                    {/* 流程时间线 */}
                    {workflowDef && (
                        <div style={{ marginTop: 12 }}>
                            <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.progress.timeline', defaultMessage: '流程时间线、节点表单与审批历史' })}</strong>
                            <Steps
                                size="small"
                                direction="vertical"
                                style={{ marginTop: 8 }}
                                items={(() => {
                                    const nodes: any[] = [...(workflowDef.graph?.nodes || [])];
                                    const completedIds = new Set((approvalHistory || []).map((r: any) => r.nodeId));
                                    const currentId = workflowInstance.currentNodeId;

                                    const sorted = nodes.sort((a, b) => {
                                        if (a.type === 'start') return -1;
                                        if (b.type === 'start') return 1;
                                        if (a.type === 'end') return 1;
                                        if (b.type === 'end') return -1;
                                        return 0;
                                    });

                                    return sorted.map((n: any) => {
                                        const isCurrent = n.id === currentId;
                                        const status = isCurrent
                                            ? 'process'
                                            : completedIds.has(n.id) || (n.type === 'start' && currentId && currentId !== n.id)
                                                ? 'finish'
                                                : 'wait';

                                        const nodeHistory = (approvalHistory || []).filter((h: any) => h.nodeId === n.id);
                                        const nodeFormData = nodeForms?.[n.id];
                                        const descriptionElements: React.ReactNode[] = [];

                                        if (isCurrent) {
                                            descriptionElements.push(
                                                <div key="current" style={{ fontSize: 12, color: '#1890ff', fontWeight: 500, marginBottom: 4 }}>
                                                    {intl.formatMessage({ id: 'pages.workflow.current', defaultMessage: '当前节点' })}
                                                </div>
                                            );
                                        }

                                        if (nodeFormData?.def && nodeFormData.def.fields?.length > 0) {
                                            descriptionElements.push(
                                                <div key="form" style={{ marginTop: 8, marginBottom: 4 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 }}>
                                                        {intl.formatMessage({ id: 'pages.document.detail.nodeFormData', defaultMessage: '节点表单' })}:
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#666', paddingLeft: 8 }}>
                                                        {nodeFormData.def.fields.map((f) => (
                                                            <div key={f.dataKey} style={{ marginBottom: 2 }}>
                                                                <span style={{ fontWeight: 500 }}>{f.label || f.dataKey}:</span> {formatFormValue(nodeFormData.values?.[f.dataKey], f.type)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (nodeHistory.length > 0) {
                                            descriptionElements.push(
                                                <div key="history" style={{ marginTop: 8 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 }}>
                                                        {intl.formatMessage({ id: 'pages.workflow.monitor.history.title', defaultMessage: '审批记录' })}:
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#666', paddingLeft: 8 }}>
                                                        {nodeHistory.map((record: any, idx: number) => {
                                                            const actionMeta = getStatusMeta(intl, record.action as ApprovalAction, approvalActionMap);
                                                            return (
                                                                <div key={idx} style={{
                                                                    marginBottom: 12,
                                                                    padding: 8,
                                                                    background: '#f8fafc',
                                                                    borderRadius: 4,
                                                                    borderLeft: `3px solid ${actionMeta.color}`
                                                                }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: 600, color: '#262626' }}>{record.approverName || record.approverId}</span>
                                                                        <Tag color={actionMeta.color} style={{ fontSize: 10, borderRadius: 10 }}>{actionMeta.text}</Tag>
                                                                    </div>
                                                                    {record.comment && (
                                                                        <div style={{ color: '#595959', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                                                                            "{record.comment}"
                                                                        </div>
                                                                    )}
                                                                    {record.approvedAt && (
                                                                        <div style={{ color: '#bfbfbf', fontSize: 10, marginTop: 4 }}>
                                                                            <ReloadOutlined style={{ marginRight: 4 }} />
                                                                            {dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return {
                                            title: `${n.label || n.id} (${typeLabel(n.type)})`,
                                            status,
                                            description: descriptionElements.length > 0 ? (
                                                <div style={{ marginTop: 4 }}>{descriptionElements}</div>
                                            ) : undefined,
                                        };
                                    });
                                })()}
                            />
                        </div>
                    )}

                    {/* 流程图 */}
                    {workflowDef?.graph && (
                        <div style={{ marginTop: 12 }}>
                            <strong>{intl.formatMessage({ id: 'pages.document.detail.workflowGraph', defaultMessage: '流程图' })}</strong>
                            <div style={{
                                height: 360,
                                marginTop: 8,
                                border: '1px solid #f0f0f0',
                                borderRadius: 8,
                                overflow: 'hidden',
                            }}>
                                {graphNodes.length > 0 ? (
                                    <ReactFlow
                                        nodes={graphNodes}
                                        edges={graphEdges}
                                        fitView
                                        nodesDraggable={false}
                                        nodesConnectable={false}
                                        elementsSelectable={false}
                                        proOptions={{ hideAttribution: true }}
                                    >
                                        <MiniMap pannable zoomable />
                                        <Controls showInteractive={false} />
                                        <Background gap={12} size={1} />
                                    </ReactFlow>
                                ) : (
                                    <div style={{ padding: 12, color: '#999' }}>
                                        {intl.formatMessage({ id: 'pages.workflow.graph.empty', defaultMessage: '暂无流程图数据' })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 节点表单 */}
                    {nodeFormDef && (
                        <div style={{ marginTop: 12 }}>
                            <strong>{intl.formatMessage({ id: 'pages.document.detail.nodeFormData', defaultMessage: '审批节点表单' })}</strong>
                            {nodeFormDef.fields?.length ? (
                                <Descriptions column={1} bordered style={{ marginTop: 8 }}>
                                    {nodeFormDef.fields.map((f) => (
                                        <Descriptions.Item key={`node-${f.dataKey}`} label={f.label || f.dataKey}>
                                            {formatFormValue(nodeFormValues?.[f.dataKey], f.type)}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            ) : (
                                <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 8, minHeight: 80, whiteSpace: 'pre-wrap', marginTop: 8 }}>
                                    {intl.formatMessage({ id: 'pages.document.detail.nodeFormData.empty', defaultMessage: '暂无节点表单数据' })}
                                </pre>
                            )}
                        </div>
                    )}
                </Card>
            )}
        </Drawer>
    );
};

export default DocumentDetailDrawer;
