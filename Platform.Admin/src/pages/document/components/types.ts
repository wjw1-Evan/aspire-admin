/**
 * Document Approval - Shared Types
 */

import type { FormDefinition, WorkflowDefinition } from '@/services/workflow/api';
import type { Document, DocumentStatistics } from '@/services/document/api';

// 可退回节点
export interface ReturnableNode {
    id: string;
    label: string;
    type: string;
}

// 节点表单数据
export interface NodeFormData {
    def: FormDefinition | null;
    values: Record<string, any>;
}

// 详情数据
export interface DetailData {
    document?: Document;
    workflowInstance?: any;
    approvalHistory?: any[];
    workflowDefinition?: WorkflowDefinition;
}

// 审批 Modal Props 基类
export interface ApprovalModalBaseProps {
    open: boolean;
    onCancel: () => void;
    loading: boolean;
}

// 审批 Modal Props
export interface ApproveModalProps extends ApprovalModalBaseProps {
    nodeFormDef: FormDefinition | null;
    nodeFormInitialValues: Record<string, any>;
    onSubmit: (values: { nodeValues: Record<string, any>; comment?: string }) => void;
}

// 拒绝 Modal Props
export interface RejectModalProps extends ApprovalModalBaseProps {
    onSubmit: (values: { comment: string }) => void;
}

// 退回 Modal Props
export interface ReturnModalProps extends ApprovalModalBaseProps {
    returnableNodes: ReturnableNode[];
    onSubmit: (values: { targetNodeId: string; comment: string }) => void;
}

// 转办 Modal Props
export interface DelegateModalProps extends ApprovalModalBaseProps {
    users: Array<{ id: string; username: string }>;
    onSubmit: (values: { delegateToUserId: string; comment?: string }) => void;
}

// 文档详情 Drawer Props
export interface DocumentDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    detailData: DetailData | null;
    workflowDef: WorkflowDefinition | null;
    formDef: FormDefinition | null;
    formValues: Record<string, any> | null;
    nodeFormDef: FormDefinition | null;
    nodeFormValues: Record<string, any> | null;
    nodeForms: Record<string, NodeFormData>;
}

// 重导出服务类型
export type { Document, DocumentStatistics, FormDefinition, WorkflowDefinition };
