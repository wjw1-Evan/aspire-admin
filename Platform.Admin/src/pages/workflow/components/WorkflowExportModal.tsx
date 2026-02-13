import React, { useState } from 'react';
import {
    Modal,
    Form,
    Select,
    Checkbox,
    Button,
    Space,
    message,
    Typography,
    Card,
    Row,
    Col,
    Divider,
} from 'antd';
import { DownloadOutlined, ExportOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { exportWorkflows, exportFilteredWorkflows } from '@/services/workflow/api';

const { Text } = Typography;
const { Option } = Select;

interface WorkflowExportModalProps {
    open: boolean;
    onCancel: () => void;
    selectedWorkflowIds?: string[];
    filters?: Record<string, any>;
}

interface ExportConfig {
    format: 'json' | 'csv' | 'excel';
    includeAnalytics: boolean;
    includeDependencies: boolean;
}

const WorkflowExportModal: React.FC<WorkflowExportModalProps> = ({
    open,
    onCancel,
    selectedWorkflowIds = [],
    filters = {},
}) => {
    const intl = useIntl();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleExport = async (values: ExportConfig) => {
        try {
            setLoading(true);

            const config = {
                format: values.format,
                includeAnalytics: values.includeAnalytics,
                includeDependencies: values.includeDependencies,
            };

            let response;
            if (selectedWorkflowIds.length > 0) {
                // 导出选中的工作流
                response = await exportWorkflows({
                    workflowIds: selectedWorkflowIds,
                    config,
                });
            } else {
                // 导出过滤结果
                response = await exportFilteredWorkflows({
                    filters,
                    config,
                });
            }

            if (response.success && response.data) {
                // 创建下载链接
                const blob = new Blob([response.data], {
                    type: getContentType(values.format),
                });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `workflows_export_${new Date().toISOString().split('T')[0]}.${values.format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                message.success(
                    intl.formatMessage({ id: 'pages.workflow.export.success' })
                );
                onCancel();
            } else {
                message.error(
                    response.message ||
                    intl.formatMessage({ id: 'pages.workflow.export.failed' })
                );
            }
        } catch (error) {
            console.error('Export failed:', error);
            message.error(
                intl.formatMessage({ id: 'pages.workflow.export.failed' })
            );
        } finally {
            setLoading(false);
        }
    };

    const getContentType = (format: string) => {
        switch (format) {
            case 'json':
                return 'application/json';
            case 'csv':
                return 'text/csv';
            case 'excel':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            default:
                return 'application/octet-stream';
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={
                <Space>
                    <ExportOutlined />
                    {intl.formatMessage({ id: 'pages.workflow.export.title' })}
                </Space>
            }
            open={open}
            onCancel={handleCancel}
            footer={null}
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleExport}
                initialValues={{
                    format: 'json',
                    includeAnalytics: true,
                    includeDependencies: true,
                }}
            >
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                        {selectedWorkflowIds.length > 0
                            ? intl.formatMessage(
                                { id: 'pages.workflow.export.selectedCount' },
                                { count: selectedWorkflowIds.length }
                            )
                            : intl.formatMessage({ id: 'pages.workflow.export.filteredResults' })}
                    </Text>
                </Card>

                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item
                            name="format"
                            label={intl.formatMessage({ id: 'pages.workflow.export.format' })}
                            rules={[
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'pages.workflow.export.format.required',
                                    }),
                                },
                            ]}
                        >
                            <Select>
                                <Option value="json">
                                    JSON - {intl.formatMessage({ id: 'pages.workflow.export.format.json.desc' })}
                                </Option>
                                <Option value="csv">
                                    CSV - {intl.formatMessage({ id: 'pages.workflow.export.format.csv.desc' })}
                                </Option>
                                <Option value="excel">
                                    Excel - {intl.formatMessage({ id: 'pages.workflow.export.format.excel.desc' })}
                                </Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">
                    {intl.formatMessage({ id: 'pages.workflow.export.options' })}
                </Divider>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="includeAnalytics" valuePropName="checked">
                            <Checkbox>
                                {intl.formatMessage({ id: 'pages.workflow.export.includeAnalytics' })}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="includeDependencies" valuePropName="checked">
                            <Checkbox>
                                {intl.formatMessage({ id: 'pages.workflow.export.includeDependencies' })}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>

                <Text type="secondary" style={{ fontSize: '12px' }}>
                    {intl.formatMessage({ id: 'pages.workflow.export.description' })}
                </Text>

                <Divider />

                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={handleCancel}>
                        {intl.formatMessage({ id: 'pages.button.cancel' })}
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        icon={<DownloadOutlined />}
                    >
                        {intl.formatMessage({ id: 'pages.workflow.export.download' })}
                    </Button>
                </Space>
            </Form>
        </Modal>
    );
};

export default WorkflowExportModal;