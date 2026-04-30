import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import {
    Card,
    Button,
    Tag,
    Space,
    Typography,
    Tooltip,
    Divider,
    message,
    Alert,
} from 'antd';
import {
    SaveOutlined,
    ReloadOutlined,
    InfoCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDeviceTwin } from '@/services/iotService';

const { Text, Title } = Typography;

interface DeviceTwinPanelProps {
    deviceId: string;
}

const JsonEditor: React.FC<{
    value: Record<string, any>;
    onChange?: (val: Record<string, any>) => void;
    readonly?: boolean;
}> = ({ value, onChange, readonly = false }) => {
    const intl = useIntl();
    const [text, setText] = useState(JSON.stringify(value, null, 2));
    const [error, setError] = useState<string>();

    useEffect(() => {
        setText(JSON.stringify(value, null, 2));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const raw = e.target.value;
        setText(raw);
        try {
            const parsed = JSON.parse(raw);
            setError(undefined);
            onChange?.(parsed);
        } catch {
            setError(intl.formatMessage({ id: 'pages.iotPlatform.command.jsonFormatError', defaultMessage: 'JSON 格式错误，请检查' }));
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <textarea
                value={text}
                onChange={handleChange}
                readOnly={readonly}
                style={{
                    width: '100%',
                    minHeight: 280,
                    fontFamily: 'Monaco, Menlo, Consolas, monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    padding: '10px 12px',
                    border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
                    borderRadius: 6,
                    background: readonly ? '#f5f5f5' : '#fff',
                    resize: 'vertical',
                    outline: 'none',
                    color: '#1a1a1a',
                }}
            />
            {error && (
                <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    {error}
                </Text>
            )}
        </div>
    );
};

const DeviceTwinPanel: React.FC<DeviceTwinPanelProps> = ({ deviceId }) => {
    const intl = useIntl();
    const [twin, setTwin] = useState<IoTDeviceTwin | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [desiredDraft, setDesiredDraft] = useState<Record<string, any>>({});

    const loadTwin = useCallback(async () => {
        setLoading(true);
        try {
            const res = await iotService.getDeviceTwin(deviceId);
            if (res.success) {
                setTwin(res.data ?? null);
                setDesiredDraft(res.data?.desiredProperties ?? {});
            }
        } catch {
            message.error(intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.loadFailed', defaultMessage: '加载设备孪生失败' }));
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => {
        loadTwin();
    }, [loadTwin]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await iotService.updateDesiredProperties(deviceId, desiredDraft);
            if (res.success && res.data) {
                message.success(intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.desiredPropertiesUpdated', defaultMessage: '期望属性已更新 (版本 {version})' }, { version: res.data.desiredVersion }));
                setTwin(res.data);
            }
        } catch {
            message.error(intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.saveFailed', defaultMessage: '保存失败' }));
        } finally {
            setSaving(false);
        }
    };

    const metaTagStyle: React.CSSProperties = {
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 20,
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <ReloadOutlined spin /> {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.loading', defaultMessage: '加载设备孪生中...' })}
            </div>
        );
    }

    return (
        <div>
            {/* Header Metadata */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 16,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #f0f5ff 0%, #e6fffb 100%)',
                    borderRadius: 8,
                    border: '1px solid #d6e4ff',
                }}
            >
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                    ETag: <strong>{twin?.etag?.slice(0, 12) ?? '-'}...</strong>
                </Text>
                <Tag color="blue" style={metaTagStyle}>
                    {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.desired', defaultMessage: 'Desired' })} v{twin?.desiredVersion ?? '-'}
                </Tag>
                <Tag color="green" style={metaTagStyle}>
                    {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.reported', defaultMessage: 'Reported' })} v{twin?.reportedVersion ?? '-'}
                </Tag>
                <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={loadTwin}
                    style={{ marginLeft: 'auto' }}
                >
                    {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.refresh', defaultMessage: '刷新' })}
                </Button>
            </div>

            <Alert
                type="info"
                showIcon
                message={intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.desiredInfo', defaultMessage: 'Desired Properties 由管理端配置，设备连接后读取并执行；Reported Properties 由设备上报，反映设备实际状态。' })}
                style={{ marginBottom: 16, fontSize: 12 }}
                closable
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Desired Properties */}
                <Card
                    size="small"
                    title={
                        <Space>
                            <span>⚙️ {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.desiredProperties', defaultMessage: 'Desired Properties' })}</span>
                            <Tag color="blue" style={metaTagStyle}>{intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.desiredVersion', defaultMessage: '版本 {version}' }, { version: twin?.desiredVersion ?? '-' })}</Tag>
                        </Space>
                    }
                    extra={
                        <Button
                            type="primary"
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                        >
                            {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.save', defaultMessage: '保存' })}
                        </Button>
                    }
                    bodyStyle={{ padding: '12px 8px' }}
                >
                    <JsonEditor
                        value={desiredDraft}
                        onChange={setDesiredDraft}
                    />
                    {twin?.desiredUpdatedAt && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                            <ClockCircleOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.lastUpdate', defaultMessage: '最后更新' })}: {dayjs(twin.desiredUpdatedAt).format('MM-DD HH:mm:ss')}
                        </Text>
                    )}
                </Card>

                {/* Reported Properties */}
                <Card
                    size="small"
                    title={
                        <Space>
                            <span>📡 {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.reportedProperties', defaultMessage: 'Reported Properties' })}</span>
                            <Tag color="green" style={metaTagStyle}>{intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.desiredVersion', defaultMessage: '版本 {version}' }, { version: twin?.reportedVersion ?? 0 })}</Tag>
                        </Space>
                    }
                    extra={
                        <Tooltip title={intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.readonlyTooltip', defaultMessage: '由设备端上报，管理端只读' })}>
                            <Tag color="default">{intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.readonly', defaultMessage: '只读' })}</Tag>
                        </Tooltip>
                    }
                    bodyStyle={{ padding: '12px 8px' }}
                >
                    <JsonEditor
                        value={twin?.reportedProperties ?? {}}
                        readonly
                    />
                    {twin?.reportedUpdatedAt ? (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                            <ClockCircleOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.desiredLastReport', defaultMessage: '设备最后上报' })}: {dayjs(twin.reportedUpdatedAt).format('MM-DD HH:mm:ss')}
                        </Text>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                            {intl.formatMessage({ id: 'pages.iotPlatform.deviceTwin.noReport', defaultMessage: '设备尚未上报属性' })}
                        </Text>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default DeviceTwinPanel;
