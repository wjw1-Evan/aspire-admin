import React, { useState, useCallback } from 'react';
import {
    Card,
    Button,
    Input,
    Form,
    Select,
    Tag,
    Space,
    Typography,
    Divider,
    message,
    Timeline,
    Tooltip,
    InputNumber,
    Empty,
} from 'antd';
import { ProForm } from '@ant-design/pro-components';
import {
    SendOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDeviceCommand, CommandStatus } from '@/services/iotService';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// 预置命令列表（对标 Azure IoT Hub 常见直接方法）
const PRESET_COMMANDS = [
    { label: 'restart — 重启设备', value: 'restart' },
    { label: 'reboot — 强制重启', value: 'reboot' },
    { label: 'getStatus — 获取设备状态', value: 'getStatus' },
    { label: 'setReportInterval — 设置上报间隔', value: 'setReportInterval' },
    { label: 'setThreshold — 设置告警阈值', value: 'setThreshold' },
    { label: 'enableDataPoint — 启用数据点', value: 'enableDataPoint' },
    { label: 'disableDataPoint — 禁用数据点', value: 'disableDataPoint' },
    { label: 'factoryReset — 恢复出厂设置', value: 'factoryReset' },
];

const statusConfig: Record<CommandStatus, { color: string; icon: React.ReactNode; label: string }> = {
    Pending: { color: 'default', icon: <ClockCircleOutlined />, label: '待下发' },
    Delivered: { color: 'processing', icon: <LoadingOutlined />, label: '已下发' },
    Executed: { color: 'success', icon: <CheckCircleOutlined />, label: '已执行' },
    Failed: { color: 'error', icon: <CloseCircleOutlined />, label: '执行失败' },
    Expired: { color: 'default', icon: <StopOutlined />, label: '已过期' },
};

interface CommandCenterPanelProps {
    deviceId: string;
}

const CommandCenterPanel: React.FC<CommandCenterPanelProps> = ({ deviceId }) => {
    const [form] = ProForm.useForm();
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<IoTDeviceCommand[]>([]);
    const [payloadText, setPayloadText] = useState('{}');
    const [payloadError, setPayloadError] = useState<string>();

    const handlePayloadChange = (val: string) => {
        setPayloadText(val);
        try {
            JSON.parse(val);
            setPayloadError(undefined);
        } catch {
            setPayloadError('JSON 格式错误，请检查');
        }
    };

    const handlePresetSelect = (value: string) => {
        form.setFieldValue('commandName', value);
        // 根据预置命令提供示例 payload
        const examples: Record<string, string> = {
            setReportInterval: JSON.stringify({ intervalSeconds: 60 }, null, 2),
            setThreshold: JSON.stringify({ dataPointId: 'dp_001', threshold: 80, thresholdHigh: 100 }, null, 2),
            enableDataPoint: JSON.stringify({ dataPointId: 'dp_001' }, null, 2),
            disableDataPoint: JSON.stringify({ dataPointId: 'dp_001' }, null, 2),
        };
        setPayloadText(examples[value] ?? '{}');
    };

    const handleSend = useCallback(async () => {
        try {
            await form.validateFields();
            if (payloadError) {
                message.error('请修复 JSON 格式错误后再发送');
                return;
            }

            const values = form.getFieldsValue();
            let payload: Record<string, any> | undefined;
            try {
                const parsed = JSON.parse(payloadText);
                payload = Object.keys(parsed).length > 0 ? parsed : undefined;
            } catch {
                payload = undefined;
            }

            setSending(true);
            const res = await iotService.sendCommand(deviceId, values.commandName, payload, values.ttlHours ?? 24);
            if (res.success && res.data) {
                message.success(`命令 "${values.commandName}" 已发送，ID: ${res.data.id.slice(-8)}`);
                setHistory((prev) => [res.data, ...prev].filter(Boolean) as IoTDeviceCommand[]);
                form.setFieldValue('commandName', undefined);
                setPayloadText('{}');
            }
        } catch (err: any) {
            if (err?.errorFields) return; // form validation error
            message.error('发送失败: ' + (err?.message ?? '未知错误'));
        } finally {
            setSending(false);
        }
    }, [form, payloadText, payloadError, deviceId]);

    const renderCommandItem = (cmd: IoTDeviceCommand) => {
        const cfg = statusConfig[cmd.status];
        return (
            <Timeline.Item
                key={cmd.id}
                color={cfg.color === 'success' ? 'green' : cfg.color === 'error' ? 'red' : cfg.color === 'processing' ? 'blue' : 'gray'}
                dot={cfg.icon}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Space size={4} style={{ marginBottom: 4 }}>
                            <Text strong style={{ fontSize: 13 }}>{cmd.commandName}</Text>
                            <Tag color={cfg.color}>{cfg.label}</Tag>
                        </Space>
                        {cmd.payload && (
                            <div
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: 11,
                                    background: '#f5f5f5',
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    marginBottom: 4,
                                    maxHeight: 80,
                                    overflow: 'auto',
                                }}
                            >
                                {JSON.stringify(cmd.payload, null, 2)}
                            </div>
                        )}
                        {cmd.responsePayload && (
                            <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>回复: </Text>
                                <Text style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                    {JSON.stringify(cmd.responsePayload)}
                                </Text>
                            </div>
                        )}
                        {cmd.errorMessage && (
                            <Text type="danger" style={{ fontSize: 11 }}>
                                错误: {cmd.errorMessage}
                            </Text>
                        )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            {dayjs(cmd.createdAt).format('HH:mm:ss')}
                        </Text>
                        <Tooltip title={`过期: ${dayjs(cmd.expiresAt).format('MM-DD HH:mm')}`}>
                            <Text type="secondary" style={{ fontSize: 10 }}>TTL ⏱</Text>
                        </Tooltip>
                    </div>
                </div>
            </Timeline.Item>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 发送命令面板 */}
            <Card
                size="small"
                title={<><SendOutlined style={{ marginRight: 6, color: '#1677ff' }} />发送命令（Direct Method）</>}
                style={{
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #f0f5ff 0%, #fff 100%)',
                }}
            >
                <Form form={form} layout="vertical">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Form.Item
                            label="预置命令"
                            style={{ marginBottom: 0 }}
                        >
                            <Select
                                placeholder="选择预置命令（或手动输入）"
                                options={PRESET_COMMANDS}
                                onChange={handlePresetSelect}
                                allowClear
                                showSearch
                            />
                        </Form.Item>
                        <Form.Item
                            label="命令名称"
                            name="commandName"
                            rules={[{ required: true, message: '请输入命令名称' }]}
                            style={{ marginBottom: 0 }}
                        >
                            <Input placeholder="如 restart、setThreshold" />
                        </Form.Item>
                    </div>

                    <Form.Item label="命令参数 (JSON)" style={{ marginBottom: 0, marginTop: 12 }}>
                        <TextArea
                            value={payloadText}
                            onChange={(e) => handlePayloadChange(e.target.value)}
                            rows={5}
                            style={{
                                fontFamily: 'Monaco, Menlo, monospace',
                                fontSize: 12,
                                border: payloadError ? '1px solid #ff4d4f' : undefined,
                            }}
                            placeholder='{"key": "value"}'
                        />
                        {payloadError && (
                            <Text type="danger" style={{ fontSize: 12 }}>{payloadError}</Text>
                        )}
                    </Form.Item>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                        <Form.Item label="TTL（小时）" name="ttlHours" initialValue={24} style={{ marginBottom: 0, flex: '0 0 auto' }}>
                            <InputNumber min={1} max={168} style={{ width: 100 }} />
                        </Form.Item>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            loading={sending}
                            onClick={handleSend}
                            style={{ marginTop: 'auto', marginBottom: 0 }}
                        >
                            发送命令
                        </Button>
                    </div>
                </Form>
            </Card>

            {/* 命令历史列表 */}
            <Card
                size="small"
                title="📋 本次会话命令记录"
                bodyStyle={{ padding: '12px 16px', maxHeight: 400, overflow: 'auto' }}
            >
                {history.length === 0 ? (
                    <Empty description="暂无命令记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <Timeline>
                        {history.map(renderCommandItem)}
                    </Timeline>
                )}
            </Card>
        </div>
    );
};

export default CommandCenterPanel;
