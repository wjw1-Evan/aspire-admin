import { DocumentStatus } from '@/services/document/api';
import { WorkflowStatus, ApprovalAction } from '@/services/workflow/api';

export type StatusMeta = { color: string; text: string };

export const documentStatusMap: Record<string, StatusMeta> = {
    draft: { color: 'default', text: 'pages.document.status.draft' },
    pending: { color: 'processing', text: 'pages.document.status.pending' },
    approved: { color: 'success', text: 'pages.document.status.approved' },
    rejected: { color: 'error', text: 'pages.document.status.rejected' },
};

export const workflowStatusMap: Record<string, StatusMeta> = {
    running: { color: 'processing', text: 'pages.workflow.monitor.status.running' },
    completed: { color: 'success', text: 'pages.workflow.monitor.status.completed' },
    cancelled: { color: 'default', text: 'pages.workflow.monitor.status.cancelled' },
    rejected: { color: 'error', text: 'pages.workflow.monitor.status.rejected' },
};

export const approvalActionMap: Record<string, StatusMeta> = {
    [ApprovalAction.Approve]: { color: 'success', text: 'pages.workflow.monitor.history.action.approve' },
    [ApprovalAction.Reject]: { color: 'error', text: 'pages.workflow.monitor.history.action.reject' },
    [ApprovalAction.Return]: { color: 'warning', text: 'pages.workflow.monitor.history.action.return' },
    [ApprovalAction.Delegate]: { color: 'purple', text: 'pages.workflow.monitor.history.action.delegate' },
};

export const getStatusMeta = (
    intl: any,
    status: string | number | null | undefined,
    map: Record<string, StatusMeta>,
    fallback: StatusMeta = { color: 'default', text: 'status.unknown' }
): StatusMeta => {
    const key = String(status ?? '').toLowerCase();
    const meta = map[key];
    if (!meta) {
        const text = intl?.formatMessage
            ? intl.formatMessage({ id: fallback.text, defaultMessage: '未知' })
            : fallback.text;
        return { ...fallback, text };
    }
    return {
        color: meta.color,
        text: intl?.formatMessage ? intl.formatMessage({ id: meta.text, defaultMessage: meta.text }) : meta.text,
    };
};
