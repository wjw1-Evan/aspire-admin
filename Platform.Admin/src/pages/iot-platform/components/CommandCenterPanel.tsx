import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components/es/form';
import { useIntl } from '@umijs/max';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import { CommandStatus, IoTDeviceCommand, iotService } from '@/services/iotService';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const PRESET_COMMANDS = [
  { labelId: 'pages.iotPlatform.command.label.restart', value: 'restart' },
  { labelId: 'pages.iotPlatform.command.label.reboot', value: 'reboot' },
  { labelId: 'pages.iotPlatform.command.label.getStatus', value: 'getStatus' },
  { labelId: 'pages.iotPlatform.command.label.setReportInterval', value: 'setReportInterval' },
  { labelId: 'pages.iotPlatform.command.label.setThreshold', value: 'setThreshold' },
  { labelId: 'pages.iotPlatform.command.label.enableDataPoint', value: 'enableDataPoint' },
  { labelId: 'pages.iotPlatform.command.label.disableDataPoint', value: 'disableDataPoint' },
  { labelId: 'pages.iotPlatform.command.label.factoryReset', value: 'factoryReset' },
];

const statusConfig: Record<
  CommandStatus,
  { color: string; icon: React.ReactNode; labelId: string; defaultLabel: string }
> = {
  Pending: {
    color: 'default',
    icon: <ClockCircleOutlined />,
    labelId: 'pages.iotPlatform.command.status.pending',
    defaultLabel: '待下发',
  },
  Delivered: {
    color: 'processing',
    icon: <LoadingOutlined />,
    labelId: 'pages.iotPlatform.command.status.delivered',
    defaultLabel: '已下发',
  },
  Executed: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    labelId: 'pages.iotPlatform.command.status.executed',
    defaultLabel: '已执行',
  },
  Failed: {
    color: 'error',
    icon: <CloseCircleOutlined />,
    labelId: 'pages.iotPlatform.command.status.failed',
    defaultLabel: '执行失败',
  },
  Expired: {
    color: 'default',
    icon: <StopOutlined />,
    labelId: 'pages.iotPlatform.command.status.expired',
    defaultLabel: '已过期',
  },
};

interface CommandCenterPanelProps {
  deviceId: string;
}

const CommandCenterPanel: React.FC<CommandCenterPanelProps> = ({ deviceId }) => {
  const intl = useIntl();
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
      setPayloadError(intl.formatMessage({ id: 'pages.iotPlatform.command.jsonFormatError' }));
    }
  };

  const handlePresetSelect = (value: string) => {
    form.setFieldValue('commandName', value);
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
        message.error(intl.formatMessage({ id: 'pages.iotPlatform.command.jsonError' }));
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
        message.success(
          intl.formatMessage(
            { id: 'pages.iotPlatform.command.sent' },
            { name: values.commandName, id: res.data.id.slice(-8) },
          ),
        );
        setHistory((prev) => [res.data, ...prev].filter(Boolean) as IoTDeviceCommand[]);
        form.setFieldValue('commandName', undefined);
        setPayloadText('{}');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(
        intl.formatMessage({ id: 'pages.iotPlatform.command.sendFailed' }) +
          ': ' +
          (err?.message ?? intl.formatMessage({ id: 'pages.iotPlatform.command.unknownError' })),
      );
    } finally {
      setSending(false);
    }
  }, [form, payloadText, payloadError, deviceId, intl.formatMessage]);

  const renderCommandItem = (cmd: IoTDeviceCommand) => {
    const cfg = statusConfig[cmd.status];
    return (
      <Timeline.Item
        key={cmd.id}
        color={
          cfg.color === 'success'
            ? 'green'
            : cfg.color === 'error'
              ? 'red'
              : cfg.color === 'processing'
                ? 'blue'
                : 'gray'
        }
        dot={cfg.icon}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Space size={4} style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 13 }}>
                {cmd.commandName}
              </Text>
              <Tag color={cfg.color}>{intl.formatMessage({ id: cfg.labelId })}</Tag>
            </Space>
            {cmd.payload && (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  background: 'var(--ant-color-fill-tertiary)',
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
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {intl.formatMessage({ id: 'pages.iotPlatform.command.reply' })}:{' '}
                </Text>
                <Text style={{ fontFamily: 'monospace', fontSize: 11 }}>{JSON.stringify(cmd.responsePayload)}</Text>
              </div>
            )}
            {cmd.errorMessage && (
              <Text type="danger" style={{ fontSize: 11 }}>
                {intl.formatMessage({ id: 'pages.iotPlatform.command.error' })}: {cmd.errorMessage}
              </Text>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {dayjs(cmd.createdAt).format('HH:mm:ss')}
            </Text>
            <Tooltip
              title={`${intl.formatMessage({ id: 'pages.iotPlatform.command.expires' })}: ${dayjs(cmd.expiresAt).format('MM-DD HH:mm')}`}
            >
              <Text type="secondary" style={{ fontSize: 10 }}>
                TTL ⏱
              </Text>
            </Tooltip>
          </div>
        </div>
      </Timeline.Item>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        size="small"
        title={
          <>
            <SendOutlined style={{ marginRight: 6, color: '#1677ff' }} />
            {intl.formatMessage({ id: 'pages.iotPlatform.command.sendPanel' })}
          </>
        }
        style={{
          borderRadius: 8,
          background: 'linear-gradient(135deg, #f0f5ff 0%, var(--ant-color-bg-container) 100%)',
        }}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              label={intl.formatMessage({ id: 'pages.iotPlatform.command.preset' })}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder={intl.formatMessage({ id: 'pages.iotPlatform.command.presetPlaceholder' })}
                options={PRESET_COMMANDS.map((cmd) => ({
                  label: intl.formatMessage({ id: cmd.labelId }),
                  value: cmd.value,
                }))}
                onChange={handlePresetSelect}
                allowClear
                showSearch
              />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({ id: 'pages.iotPlatform.command.name' })}
              name="commandName"
              rules={[
                { required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.command.nameRequired' }) },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={intl.formatMessage({ id: 'pages.iotPlatform.command.namePlaceholder' })} />
            </Form.Item>
          </div>

          <Form.Item
            label={intl.formatMessage({ id: 'pages.iotPlatform.command.payload' })}
            style={{ marginBottom: 0, marginTop: 12 }}
          >
            <TextArea
              value={payloadText}
              onChange={(e) => handlePayloadChange(e.target.value)}
              rows={5}
              style={{
                fontFamily: 'Monaco, Menlo, monospace',
                fontSize: 12,
                border: payloadError ? '1px solid #ff4d4f' : undefined,
              }}
              placeholder={intl.formatMessage({ id: 'pages.iotPlatform.command.payloadPlaceholder' })}
            />
            {payloadError && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {payloadError}
              </Text>
            )}
          </Form.Item>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <Form.Item
              label={intl.formatMessage({ id: 'pages.iotPlatform.command.ttl' })}
              name="ttlHours"
              initialValue={24}
              style={{ marginBottom: 0, flex: '0 0 auto' }}
            >
              <InputNumber min={1} max={168} style={{ width: 100 }} />
            </Form.Item>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={handleSend}
              style={{ marginTop: 'auto', marginBottom: 0 }}
            >
              {intl.formatMessage({ id: 'pages.iotPlatform.command.send' })}
            </Button>
          </div>
        </Form>
      </Card>

      <Card
        size="small"
        title={intl.formatMessage({ id: 'pages.iotPlatform.command.history' })}
        bodyStyle={{ padding: '12px 16px', maxHeight: 400, overflow: 'auto' }}
      >
        {history.length === 0 ? (
          <Empty
            description={intl.formatMessage({ id: 'pages.iotPlatform.command.noHistory' })}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Timeline>{history.map(renderCommandItem)}</Timeline>
        )}
      </Card>
    </div>
  );
};

export default CommandCenterPanel;
