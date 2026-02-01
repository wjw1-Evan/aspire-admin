import React, { useState, useEffect } from 'react';
import {
    Modal,
    Button,
    Space,
    Select,
    Input,
    Progress,
    Alert,
    List,
    Typography,
    Divider,
    Tag,
    Card,
    Row,
    Col,
    Grid,
} from 'antd';
import {
    PlayCircleOutlined,
    StopOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { useIntl } from '@umijs/max';
import {
    createBulkOperation,
    executeBulkOperation,
    cancelBulkOperation,
    getBulkOperation,
    type BulkOperationType,
    type BulkOperationStatus,
    type BulkOperation,
} from '@/services/workflow/api';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

interface BulkOperationsPanelProps {
    visible: boolean;
    onClose: () => void;
    selectedWorkflowIds: string[];
    selectedWorkflows: Array<{ id: string; name: string; category?: string }>;
    onSuccess?: () => void;
}

const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
    visible,
    onClose,
    selectedWorkflowIds,
    selectedWorkflows,
    onSuccess,
}) => {
    const intl = useIntl();
    const message = useMessage();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [operationType, setOperationType] = useState<BulkOperationType>('Activate');
    const [categoryValue, setCategoryValue] = useState<string>('');
    const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // 操作类型选项
    const operationOptions = [
        {
            value: 'Activate' as BulkOperationType,
            label: intl.formatMessage({ id: 'pages.workflow.bulk.activate' }),
            description: intl.formatMessage({ id: 'pages.workflow.bulk.activate.desc' }),
        },
        {
            value: 'Deactivate' as BulkOperationType,
            label: intl.formatMessage({ id: 'pages.workflow.bulk.deactivate' }),
            description: intl.formatMessage({ id: 'pages.workflow.bulk.deactivate.desc' }),
        },
        {
            value: 'Delete' as BulkOperationType,
            label: intl.formatMessage({ id: 'pages.workflow.bulk.delete' }),
            description: intl.formatMessage({ id: 'pages.workflow.bulk.delete.desc' }),
        },
        {
            value: 'UpdateCategory' as BulkOperationType,
            label: intl.formatMessage({ id: 'pages.workflow.bulk.updateCategory' }),
            description: intl.formatMessage({ id: 'pages.workflow.bulk.updateCategory.desc' }),
        },
    ];

    // 清理轮询
    const clearPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    };

    // 轮询操作状态
    const startPolling = (operationId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await getBulkOperation(operationId);
                if (response.success && response.data) {
                    setCurrentOperation(response.data);

                    // 如果操作完成，停止轮询
                    if (['Completed', 'Cancelled', 'Failed'].includes(response.data.status)) {
                        clearPolling();
                        setIsExecuting(false);

                        if (response.data.status === 'Completed') {
                            message.success(intl.formatMessage({ id: 'pages.workflow.bulk.success' }));
                            onSuccess?.();
                        } else if (response.data.status === 'Failed') {
                            message.error(intl.formatMessage({ id: 'pages.workflow.bulk.failed' }));
                        }
                    }
                }
            } catch (error) {
                console.error('轮询批量操作状态失败:', error);
            }
        }, 2000); // 每2秒轮询一次

        setPollingInterval(interval);
    };

    // 执行批量操作
    const handleExecute = async () => {
        if (selectedWorkflowIds.length === 0) {
            message.warning(intl.formatMessage({ id: 'pages.workflow.bulk.noSelection' }));
            return;
        }

        if (operationType === 'UpdateCategory' && !categoryValue.trim()) {
            message.warning(intl.formatMessage({ id: 'pages.workflow.bulk.categoryRequired' }));
            return;
        }

        try {
            setIsExecuting(true);

            // 准备参数
            const parameters: Record<string, any> = {};
            if (operationType === 'UpdateCategory') {
                parameters.category = categoryValue.trim();
            }

            // 创建批量操作
            const createResponse = await createBulkOperation({
                operationType,
                workflowIds: selectedWorkflowIds,
                parameters,
            });

            if (createResponse.success && createResponse.data) {
                setCurrentOperation(createResponse.data);

                // 执行批量操作
                const executeResponse = await executeBulkOperation(createResponse.data.id);
                if (executeResponse.success) {
                    // 开始轮询状态
                    startPolling(createResponse.data.id);
                    message.info(intl.formatMessage({ id: 'pages.workflow.bulk.started' }));
                } else {
                    setIsExecuting(false);
                    message.error(intl.formatMessage({ id: 'pages.workflow.bulk.startFailed' }));
                }
            }
        } catch (error) {
            console.error('执行批量操作失败:', error);
            setIsExecuting(false);
            message.error(intl.formatMessage({ id: 'pages.workflow.bulk.executeFailed' }));
        }
    };

    // 取消操作
    const handleCancel = async () => {
        if (!currentOperation) return;

        try {
            const response = await cancelBulkOperation(currentOperation.id);
            if (response.success) {
                message.success(intl.formatMessage({ id: 'pages.workflow.bulk.cancelled' }));
                clearPolling();
                setIsExecuting(false);
                setCurrentOperation(null);
            }
        } catch (error) {
            console.error('取消批量操作失败:', error);
            message.error(intl.formatMessage({ id: 'pages.workflow.bulk.cancelFailed' }));
        }
    };

    // 重新获取状态
    const handleRefreshStatus = async () => {
        if (!currentOperation) return;

        try {
            const response = await getBulkOperation(currentOperation.id);
            if (response.success && response.data) {
                setCurrentOperation(response.data);
            }
        } catch (error) {
            console.error('刷新状态失败:', error);
        }
    };

    // 获取状态颜色
    const getStatusColor = (status: BulkOperationStatus) => {
        switch (status) {
            case 'Completed':
                return 'success';
            case 'Failed':
                return 'error';
            case 'Cancelled':
                return 'warning';
            case 'InProgress':
                return 'processing';
            default:
                return 'default';
        }
    };

    // 获取状态图标
    const getStatusIcon = (status: BulkOperationStatus) => {
        switch (status) {
            case 'Completed':
                return <CheckCircleOutlined />;
            case 'Failed':
                return <CloseCircleOutlined />;
            case 'Cancelled':
                return <ExclamationCircleOutlined />;
            case 'InProgress':
                return <PlayCircleOutlined />;
            default:
                return null;
        }
    };

    // 计算进度百分比
    const getProgressPercent = () => {
        if (!currentOperation || currentOperation.totalCount === 0) return 0;
        return Math.round((currentOperation.processedCount / currentOperation.totalCount) * 100);
    };

    // 组件卸载时清理轮询
    useEffect(() => {
        return () => {
            clearPolling();
        };
    }, []);

    // 关闭时重置状态
    const handleClose = () => {
        clearPolling();
        setIsExecuting(false);
        setCurrentOperation(null);
        setOperationType('Activate');
        setCategoryValue('');
        onClose();
    };

    return (
        <Modal
            title={intl.formatMessage({ id: 'pages.workflow.bulk.title' })}
            open={visible}
            onCancel={handleClose}
            width={isMobile ? '100%' : 800}
            footer={null}
            destroyOnClose
        >
            <div style={{ padding: '16px 0' }}>
                {/* 选中的工作流信息 */}
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={[16, 8]}>
                        <Col xs={24} sm={12}>
                            <Text strong>
                                {intl.formatMessage({ id: 'pages.workflow.bulk.selectedCount' })}:
                            </Text>
                            <Text style={{ marginLeft: 8 }}>{selectedWorkflowIds.length}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Text type="secondary">
                                {intl.formatMessage({ id: 'pages.workflow.bulk.selectedWorkflows' })}
                            </Text>
                        </Col>
                    </Row>
                    {selectedWorkflows.length > 0 && (
                        <div style={{ marginTop: 8, maxHeight: 120, overflowY: 'auto' }}>
                            <List
                                size="small"
                                dataSource={selectedWorkflows.slice(0, 10)} // 只显示前10个
                                renderItem={(item) => (
                                    <List.Item style={{ padding: '4px 0' }}>
                                        <Text ellipsis style={{ maxWidth: '100%' }}>
                                            {item.name}
                                            {item.category && (
                                                <Tag style={{ marginLeft: 8 }}>
                                                    {item.category}
                                                </Tag>
                                            )}
                                        </Text>
                                    </List.Item>
                                )}
                            />
                            {selectedWorkflows.length > 10 && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {intl.formatMessage(
                                        { id: 'pages.workflow.bulk.moreItems' },
                                        { count: selectedWorkflows.length - 10 }
                                    )}
                                </Text>
                            )}
                        </div>
                    )}
                </Card>

                {/* 操作配置 */}
                {!currentOperation && (
                    <Card size="small" style={{ marginBottom: 16 }}>
                        <Title level={5}>{intl.formatMessage({ id: 'pages.workflow.bulk.operationConfig' })}</Title>

                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                {intl.formatMessage({ id: 'pages.workflow.bulk.operationType' })}
                            </Text>
                            <Select
                                value={operationType}
                                onChange={setOperationType}
                                style={{ width: '100%' }}
                                options={operationOptions}
                                optionRender={(option) => (
                                    <div>
                                        <div>{option.data.label}</div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {option.data.description}
                                        </Text>
                                    </div>
                                )}
                            />
                        </div>

                        {operationType === 'UpdateCategory' && (
                            <div style={{ marginBottom: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                    {intl.formatMessage({ id: 'pages.workflow.bulk.newCategory' })}
                                </Text>
                                <Input
                                    value={categoryValue}
                                    onChange={(e) => setCategoryValue(e.target.value)}
                                    placeholder={intl.formatMessage({ id: 'pages.workflow.bulk.categoryPlaceholder' })}
                                />
                            </div>
                        )}

                        <Space>
                            <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={handleExecute}
                                loading={isExecuting}
                                disabled={selectedWorkflowIds.length === 0}
                            >
                                {intl.formatMessage({ id: 'pages.workflow.bulk.execute' })}
                            </Button>
                            <Button onClick={handleClose}>
                                {intl.formatMessage({ id: 'pages.button.cancel' })}
                            </Button>
                        </Space>
                    </Card>
                )}

                {/* 操作进度 */}
                {currentOperation && (
                    <Card size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Title level={5} style={{ margin: 0 }}>
                                {intl.formatMessage({ id: 'pages.workflow.bulk.progress' })}
                            </Title>
                            <Space>
                                <Tag color={getStatusColor(currentOperation.status)} icon={getStatusIcon(currentOperation.status)}>
                                    {intl.formatMessage({ id: `pages.workflow.bulk.status.${currentOperation.status.toLowerCase()}` })}
                                </Tag>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={handleRefreshStatus}
                                    disabled={isExecuting}
                                >
                                    {intl.formatMessage({ id: 'pages.button.refresh' })}
                                </Button>
                            </Space>
                        </div>

                        <Progress
                            percent={getProgressPercent()}
                            status={currentOperation.status === 'Failed' ? 'exception' : 'active'}
                            format={() => `${currentOperation.processedCount}/${currentOperation.totalCount}`}
                        />

                        <Row gutter={[16, 8]} style={{ marginTop: 16 }}>
                            <Col xs={12} sm={6}>
                                <Text type="secondary">{intl.formatMessage({ id: 'pages.workflow.bulk.total' })}</Text>
                                <div><Text strong>{currentOperation.totalCount}</Text></div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary">{intl.formatMessage({ id: 'pages.workflow.bulk.processed' })}</Text>
                                <div><Text strong>{currentOperation.processedCount}</Text></div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary">{intl.formatMessage({ id: 'pages.workflow.bulk.label.success' })}</Text>
                                <div><Text strong style={{ color: '#52c41a' }}>{currentOperation.successCount}</Text></div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary">{intl.formatMessage({ id: 'pages.workflow.bulk.label.failed' })}</Text>
                                <div><Text strong style={{ color: '#ff4d4f' }}>{currentOperation.failureCount}</Text></div>
                            </Col>
                        </Row>

                        {/* 错误信息 */}
                        {currentOperation.errors && currentOperation.errors.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <Alert
                                    type="error"
                                    message={intl.formatMessage({ id: 'pages.workflow.bulk.errors' })}
                                    description={
                                        <List
                                            size="small"
                                            dataSource={currentOperation.errors.slice(0, 5)} // 只显示前5个错误
                                            renderItem={(error) => (
                                                <List.Item>
                                                    <Text ellipsis>
                                                        <Text code>{error.workflowName || error.workflowId}</Text>: {error.errorMessage}
                                                    </Text>
                                                </List.Item>
                                            )}
                                        />
                                    }
                                />
                                {currentOperation.errors.length > 5 && (
                                    <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                                        {intl.formatMessage(
                                            { id: 'pages.workflow.bulk.moreErrors' },
                                            { count: currentOperation.errors.length - 5 }
                                        )}
                                    </Text>
                                )}
                            </div>
                        )}

                        {/* 操作按钮 */}
                        <div style={{ marginTop: 16, textAlign: 'right' }}>
                            <Space>
                                {currentOperation.cancellable && isExecuting && (
                                    <Button
                                        danger
                                        icon={<StopOutlined />}
                                        onClick={handleCancel}
                                    >
                                        {intl.formatMessage({ id: 'pages.workflow.bulk.cancel' })}
                                    </Button>
                                )}
                                <Button onClick={handleClose}>
                                    {intl.formatMessage({ id: 'pages.button.close' })}
                                </Button>
                            </Space>
                        </div>
                    </Card>
                )}
            </div>
        </Modal>
    );
};

export default BulkOperationsPanel;