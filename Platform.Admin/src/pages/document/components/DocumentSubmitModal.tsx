import React from 'react';
import { Modal, Select } from 'antd';
import { useIntl } from '@umijs/max';
import { type WorkflowDefinition } from '@/services/workflow/api';

interface DocumentSubmitModalProps {
    visible: boolean;
    onOk: () => void;
    onCancel: () => void;
    workflows: any[];
    selectedWorkflowId: string;
    onWorkflowChange: (value: string) => void;
}

const DocumentSubmitModal: React.FC<DocumentSubmitModalProps> = ({
    visible,
    onOk,
    onCancel,
    workflows,
    selectedWorkflowId,
    onWorkflowChange,
}) => {
    const intl = useIntl();

    return (
        <Modal
            title={intl.formatMessage({ id: 'pages.document.modal.submitTitle' })}
            open={visible}
            onOk={onOk}
            onCancel={onCancel}
        >
            <div>
                <label style={{ display: 'block', marginBottom: '8px' }}>
                    {intl.formatMessage({ id: 'pages.document.modal.selectWorkflow' })}:
                </label>
                <Select
                    style={{ width: '100%' }}
                    placeholder={intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' })}
                    value={selectedWorkflowId || undefined}
                    onChange={onWorkflowChange}
                >
                    {workflows
                        .filter((w) => w.isActive)
                        .map((workflow) => (
                            <Select.Option key={workflow.id} value={workflow.id}>
                                {workflow.name}
                            </Select.Option>
                        ))}
                </Select>
            </div>
        </Modal>
    );
};

export default DocumentSubmitModal;
