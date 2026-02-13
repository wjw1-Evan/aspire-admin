import React, { useState } from 'react';
import {
    Modal,
    Upload,
    Button,
    Space,
    message,
    Typography,
    Card,
    Steps,
    Result,
    List,
    Tag,
    Alert,
    Checkbox,
    Row,
    Col,
    Divider,
} from 'antd';
import {
    UploadOutlined,
    ImportOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
    validateImportFile,
    previewImport,
    importWorkflows,
    resolveImportConflicts,
} from '@/services/workflow/api';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text, Title } = Typography;
const { Step } = Steps;

interface WorkflowImportModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

interface ImportResult {
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    conflicts: ImportConflict[];
    errors: ImportError[];
    importedWorkflowIds: string[];
}

interface ImportConflict {
    workflowName: string;
    conflictType: string;
    existingWorkflowId?: string;
    description: string;
    suggestedResolution?: string;
}

interface ImportError {
    workflowName?: string;
    message: string;
    errorDetails?: string;
    lineNumber?: number;
}

const WorkflowImportModal: React.FC<WorkflowImportModalProps> = ({
    open,
    onCancel,
    onSuccess,
}) => {
    const intl = useIntl();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [conflictResolutions, setConflictResolutions] = useState<Record<string, string>>({});
    const [overwriteExisting, setOverwriteExisting] = useState(false);

    const handleFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
        setFileList(newFileList);
        if (newFileList.length === 0) {
            setCurrentStep(0);
            setValidationResult(null);
        }
    };

    const handleValidateFile = async () => {
        if (fileList.length === 0) {
            message.error(intl.formatMessage({ id: 'pages.workflow.import.selectFile' }));
            return;
        }

        const file = fileList[0];
        if (!file.originFileObj) {
            message.error(intl.formatMessage({ id: 'pages.workflow.import.invalidFile' }));
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file.originFileObj);

            const response = await validateImportFile(formData);
            if (response.success && response.data) {
                setValidationResult(response.data);
                setCurrentStep(1);

                if (response.data.conflicts.length > 0) {
                    // 初始化冲突解决方案
                    const resolutions: Record<string, string> = {};
                    response.data.conflicts.forEach(conflict => {
                        resolutions[conflict.workflowName] = 'skip'; // 默认跳过
                    });
                    setConflictResolutions(resolutions);
                }
            } else {
                message.error(
                    response.message ||
                    intl.formatMessage({ id: 'pages.workflow.import.validation.failed' })
                );
            }
        } catch (error) {
            console.error('Validation failed:', error);
            message.error(
                intl.formatMessage({ id: 'pages.workflow.import.validation.failed' })
            );
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!fileList[0]?.originFileObj) {
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', fileList[0].originFileObj);
            formData.append('overwriteExisting', overwriteExisting.toString());

            let response;
            if (validationResult?.conflicts.length > 0) {
                // 有冲突，使用冲突解决
                formData.append('resolutions', JSON.stringify(conflictResolutions));
                response = await resolveImportConflicts(formData);
            } else {
                // 无冲突，直接导入
                response = await importWorkflows(formData);
            }

            if (response.success && response.data) {
                setImportResult(response.data);
                setCurrentStep(2);

                if (response.data.importedCount > 0) {
                    message.success(
                        intl.formatMessage(
                            { id: 'pages.workflow.import.success' },
                            { count: response.data.importedCount }
                        )
                    );
                }
            } else {
                message.error(
                    response.message ||
                    intl.formatMessage({ id: 'pages.workflow.import.failed' })
                );
            }
        } catch (error) {
            console.error('Import failed:', error);
            message.error(
                intl.formatMessage({ id: 'pages.workflow.import.failed' })
            );
        } finally {
            setLoading(false);
        }
    };

    const handleConflictResolutionChange = (workflowName: string, resolution: string) => {
        setConflictResolutions(prev => ({
            ...prev,
            [workflowName]: resolution,
        }));
    };

    const handleCancel = () => {
        setCurrentStep(0);
        setFileList([]);
        setValidationResult(null);
        setImportResult(null);
        setConflictResolutions({});
        setOverwriteExisting(false);
        onCancel();
    };

    const handleFinish = () => {
        onSuccess();
        handleCancel();
    };

    const renderFileUpload = () => (
        <Card>
            <Upload
                fileList={fileList}
                onChange={handleFileChange}
                beforeUpload={() => false}
                accept=".json"
                maxCount={1}
            >
                <Button icon={<UploadOutlined />}>
                    {intl.formatMessage({ id: 'pages.workflow.import.selectFile' })}
                </Button>
            </Upload>
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                {intl.formatMessage({ id: 'pages.workflow.import.fileFormat' })}
            </Text>
        </Card>
    );

    const renderValidationResult = () => {
        if (!validationResult) return null;

        const hasErrors = validationResult.errors.length > 0;
        const hasConflicts = validationResult.conflicts.length > 0;

        return (
            <Space direction="vertical" style={{ width: '100%' }}>
                {hasErrors && (
                    <Alert
                        type="error"
                        message={intl.formatMessage({ id: 'pages.workflow.import.validation.errors' })}
                        description={
                            <List
                                size="small"
                                dataSource={validationResult.errors}
                                renderItem={(error) => (
                                    <List.Item>
                                        <Text type="danger">
                                            {error.workflowName && `${error.workflowName}: `}
                                            {error.message}
                                        </Text>
                                    </List.Item>
                                )}
                            />
                        }
                    />
                )}

                {hasConflicts && (
                    <Card
                        title={intl.formatMessage({ id: 'pages.workflow.import.conflicts.title' })}
                        size="small"
                    >
                        <List
                            dataSource={validationResult.conflicts}
                            renderItem={(conflict) => (
                                <List.Item>
                                    <Row style={{ width: '100%' }} gutter={16}>
                                        <Col span={12}>
                                            <Space direction="vertical" size="small">
                                                <Text strong>{conflict.workflowName}</Text>
                                                <Text type="secondary">{conflict.description}</Text>
                                            </Space>
                                        </Col>
                                        <Col span={12}>
                                            <Space>
                                                <Button
                                                    size="small"
                                                    type={conflictResolutions[conflict.workflowName] === 'overwrite' ? 'primary' : 'default'}
                                                    onClick={() => handleConflictResolutionChange(conflict.workflowName, 'overwrite')}
                                                >
                                                    {intl.formatMessage({ id: 'pages.workflow.import.conflicts.overwrite' })}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    type={conflictResolutions[conflict.workflowName] === 'rename' ? 'primary' : 'default'}
                                                    onClick={() => handleConflictResolutionChange(conflict.workflowName, 'rename')}
                                                >
                                                    {intl.formatMessage({ id: 'pages.workflow.import.conflicts.rename' })}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    type={conflictResolutions[conflict.workflowName] === 'skip' ? 'primary' : 'default'}
                                                    onClick={() => handleConflictResolutionChange(conflict.workflowName, 'skip')}
                                                >
                                                    {intl.formatMessage({ id: 'pages.workflow.import.conflicts.skip' })}
                                                </Button>
                                            </Space>
                                        </Col>
                                    </Row>
                                </List.Item>
                            )}
                        />
                    </Card>
                )}

                {!hasErrors && (
                    <Checkbox
                        checked={overwriteExisting}
                        onChange={(e) => setOverwriteExisting(e.target.checked)}
                    >
                        {intl.formatMessage({ id: 'pages.workflow.import.overwriteExisting' })}
                    </Checkbox>
                )}
            </Space>
        );
    };

    const renderImportResult = () => {
        if (!importResult) return null;

        const isSuccess = importResult.importedCount > 0;

        return (
            <Result
                status={isSuccess ? 'success' : 'warning'}
                title={
                    isSuccess
                        ? intl.formatMessage({ id: 'pages.workflow.import.result.success' })
                        : intl.formatMessage({ id: 'pages.workflow.import.result.partial' })
                }
                subTitle={
                    <Space direction="vertical">
                        <Text>
                            {intl.formatMessage(
                                { id: 'pages.workflow.import.result.summary' },
                                {
                                    imported: importResult.importedCount,
                                    skipped: importResult.skippedCount,
                                    failed: importResult.failedCount,
                                }
                            )}
                        </Text>
                        {importResult.errors.length > 0 && (
                            <List
                                size="small"
                                header={intl.formatMessage({ id: 'pages.workflow.import.result.errors' })}
                                dataSource={importResult.errors}
                                renderItem={(error) => (
                                    <List.Item>
                                        <Text type="danger">
                                            {error.workflowName && `${error.workflowName}: `}
                                            {error.message}
                                        </Text>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Space>
                }
            />
        );
    };

    const getStepStatus = (step: number) => {
        if (step < currentStep) return 'finish';
        if (step === currentStep) return 'process';
        return 'wait';
    };

    return (
        <Modal
            title={
                <Space>
                    <ImportOutlined />
                    {intl.formatMessage({ id: 'pages.workflow.import.title' })}
                </Space>
            }
            open={open}
            onCancel={handleCancel}
            footer={null}
            width={800}
        >
            <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Step
                    title={intl.formatMessage({ id: 'pages.workflow.import.step.upload' })}
                    icon={<FileTextOutlined />}
                    status={getStepStatus(0)}
                />
                <Step
                    title={intl.formatMessage({ id: 'pages.workflow.import.step.validate' })}
                    icon={<ExclamationCircleOutlined />}
                    status={getStepStatus(1)}
                />
                <Step
                    title={intl.formatMessage({ id: 'pages.workflow.import.step.complete' })}
                    icon={<CheckCircleOutlined />}
                    status={getStepStatus(2)}
                />
            </Steps>

            {currentStep === 0 && renderFileUpload()}
            {currentStep === 1 && renderValidationResult()}
            {currentStep === 2 && renderImportResult()}

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={handleCancel}>
                    {currentStep === 2
                        ? intl.formatMessage({ id: 'pages.button.close' })
                        : intl.formatMessage({ id: 'pages.button.cancel' })}
                </Button>

                {currentStep === 0 && (
                    <Button
                        type="primary"
                        onClick={handleValidateFile}
                        loading={loading}
                        disabled={fileList.length === 0}
                    >
                        {intl.formatMessage({ id: 'pages.workflow.import.validate' })}
                    </Button>
                )}

                {currentStep === 1 && (
                    <Button
                        type="primary"
                        onClick={handleImport}
                        loading={loading}
                        disabled={validationResult?.errors.length > 0}
                    >
                        {intl.formatMessage({ id: 'pages.workflow.import.start' })}
                    </Button>
                )}

                {currentStep === 2 && (
                    <Button type="primary" onClick={handleFinish}>
                        {intl.formatMessage({ id: 'pages.button.finish' })}
                    </Button>
                )}
            </Space>
        </Modal>
    );
};

export default WorkflowImportModal;