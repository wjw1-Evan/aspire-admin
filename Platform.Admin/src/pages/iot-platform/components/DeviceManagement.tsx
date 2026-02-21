import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useIntl } from '@umijs/max';
import type { ActionType } from '@/types/pro-components';
import DataTable from '@/components/DataTable';
import { type TableColumnsType } from 'antd';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Drawer,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
  Descriptions,
  Spin,
  Empty,
  Grid,
  Tabs,
  Alert,
  InputNumber,
  Typography,
  Divider,
} from 'antd';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
const { Text } = Typography;

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  BranchesOutlined,
  SendOutlined,
  TagOutlined,
} from '@ant-design/icons';
import {
  iotService,
  IoTDevice,
  IoTGateway,
  DeviceStatistics,
  GenerateApiKeyResult,
} from '@/services/iotService';
import { StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchFormCard from '@/components/SearchFormCard';
import { useModal } from '@/hooks/useModal';
import DeviceTwinPanel from './DeviceTwinPanel';
import CommandCenterPanel from './CommandCenterPanel';

export interface DeviceManagementRef {
  reload: () => void;
  refreshStats: () => void;
  handleAdd: () => void;
}

const DEVICE_TYPE_OPTIONS = [
  { label: '传感器 (Sensor)', value: 'Sensor' },
  { label: '执行器 (Actuator)', value: 'Actuator' },
  { label: '网关 (Gateway)', value: 'Gateway' },
  { label: '其他 (Other)', value: 'Other' },
];

const deviceTypeColor: Record<string, string> = {
  Sensor: 'blue',
  Actuator: 'orange',
  Gateway: 'purple',
  Other: 'default',
};

const deviceTypeLabel: Record<string, string> = {
  Sensor: '传感器',
  Actuator: '执行器',
  Gateway: '网关',
  Other: '其他',
};

const statusConfig = {
  Online: { color: 'green', label: '在线' },
  Offline: { color: 'default', label: '离线' },
  Fault: { color: 'red', label: '故障' },
  Maintenance: { color: 'orange', label: '维护中' },
};

const DeviceManagement = forwardRef<DeviceManagementRef>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { styles } = useCommonStyles();
  const actionRef = useRef<ActionType>(null);
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [statistics, setStatistics] = useState<DeviceStatistics | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({ total: 0, online: 0, offline: 0, fault: 0 });
  const [searchForm] = Form.useForm();
  // ApiKey 弹窗
  const [apiKeyResult, setApiKeyResult] = useState<GenerateApiKeyResult | null>(null);
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  const safeGateways = Array.isArray(gateways) ? gateways : [];

  const fetchOverviewStats = useCallback(async () => {
    try {
      const response = await iotService.getDevices(undefined, 1, 1000);
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setOverviewStats({
          total: list.length,
          online: list.filter((d: IoTDevice) => d.status === 'Online').length,
          offline: list.filter((d: IoTDevice) => d.status === 'Offline').length,
          fault: list.filter((d: IoTDevice) => d.status === 'Fault').length,
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  const fetchDevices = useCallback(async (params: any) => {
    try {
      const { keyword } = searchForm.getFieldsValue();
      const response = await iotService.getDevices(undefined, params.current || 1, params.pageSize || 20, keyword);
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        return { data: list, success: true, total: response.data.total || 0 };
      }
      return { data: [], success: false, total: 0 };
    } catch {
      message.error('加载设备列表失败');
      return { data: [], success: false, total: 0 };
    }
  }, []);

  const loadGateways = useCallback(async () => {
    try {
      const response = await iotService.getGateways(1, 1000);
      if (response.success && response.data) {
        setGateways(Array.isArray(response.data.list) ? response.data.list : []);
      } else {
        setGateways([]);
      }
    } catch {
      setGateways([]);
    }
  }, []);

  useEffect(() => {
    loadGateways();
    fetchOverviewStats();
  }, [loadGateways, fetchOverviewStats]);

  const handleAdd = useCallback(() => {
    form.resetFields();
    setSelectedDevice(null);
    setIsModalVisible(true);
  }, [form]);

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload?.(),
    refreshStats: fetchOverviewStats,
    handleAdd,
  }), [fetchOverviewStats, handleAdd]);

  const handleEdit = useCallback((device: IoTDevice) => {
    setSelectedDevice(device);
    form.setFieldsValue({
      ...device,
      // Tags 从 object 转为 "key:value" 字符串数组用于 Select tags 模式
      tagsList: device.tags ? Object.entries(device.tags).map(([k, v]) => `${k}:${v}`) : [],
    });
    setIsModalVisible(true);
  }, [form]);

  const handleView = useCallback(async (device: IoTDevice) => {
    setSelectedDevice(device);
    try {
      const response = await iotService.getDeviceStatistics(device.deviceId);
      if (response.success) setStatistics(response.data);
    } catch {
      console.error('Failed to load statistics');
    }
    setIsDetailDrawerVisible(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await iotService.deleteDevice(id);
      if (response.success) {
        message.success('删除成功');
        actionRef.current?.reload?.();
        fetchOverviewStats();
      }
    } catch {
      message.error('删除失败');
    }
  }, [fetchOverviewStats]);

  const handleSubmit = useCallback(async (values: any) => {
    // 将 tagsList 数组 ("key:value") 还原为 object
    const tags: Record<string, string> = {};
    (values.tagsList || []).forEach((t: string) => {
      const idx = t.indexOf(':');
      if (idx > 0) {
        tags[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
      } else {
        tags[t.trim()] = '';
      }
    });
    const payload = { ...values, tags, tagsList: undefined };

    try {
      if (selectedDevice) {
        const response = await iotService.updateDevice(selectedDevice.id, payload);
        if (response.success) message.success('更新成功');
      } else {
        const response = await iotService.createDevice(payload);
        if (response.success) message.success('创建成功');
      }
      handleCloseModal();
      actionRef.current?.reload?.();
      fetchOverviewStats();
    } catch {
      message.error('操作失败');
    }
  }, [selectedDevice, fetchOverviewStats]);

  const handleGenerateApiKey = useCallback(async (device: IoTDevice) => {
    setGeneratingKey(true);
    try {
      const res = await iotService.generateApiKey(device.deviceId);
      if (res.success) {
        setApiKeyResult(res.data);
        setIsApiKeyModalVisible(true);
      }
    } catch {
      message.error('生成 ApiKey 失败');
    } finally {
      setGeneratingKey(false);
    }
  }, []);

  const getStatusTag = useCallback((device: IoTDevice) => {
    const cfg = statusConfig[device.status] ?? statusConfig.Offline;
    return <Tag color={cfg.color}>{cfg.label}</Tag>;
  }, []);

  const columns: TableColumnsType<IoTDevice> = useMemo(() => [
    {
      title: '设备名称',
      dataIndex: 'title',
      key: 'title',
      width: 160,
      render: (text, record) => (
        <a onClick={() => handleView(record)} style={{ cursor: 'pointer' }}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 90,
      render: (type: string) => (
        <Tag color={deviceTypeColor[type] ?? 'default'}>{deviceTypeLabel[type] ?? type}</Tag>
      ),
    },
    {
      title: '所属网关',
      dataIndex: 'gatewayId',
      key: 'gatewayId',
      width: 140,
      render: (gatewayId: string) => {
        const gateway = safeGateways.find((g) => g.gatewayId === gatewayId);
        return gateway?.title || <Text type="secondary">独立设备</Text>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 160,
      render: (tags?: Record<string, string>) => {
        if (!tags || Object.keys(tags).length === 0) return <Text type="secondary">-</Text>;
        return (
          <Space size={2} wrap>
            {Object.entries(tags).slice(0, 3).map(([k, v]) => (
              <Tag key={k} icon={<TagOutlined />} style={{ fontSize: 11 }}>
                {k}{v ? `:${v}` : ''}
              </Tag>
            ))}
            {Object.keys(tags).length > 3 && <Tag>+{Object.keys(tags).length - 3}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 100,
      render: (v: string) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: any, device: IoTDevice) => getStatusTag(device),
    },
    {
      title: '启用',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 70,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '是' : '否'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_: any, record: IoTDevice) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            loading={generatingKey}
            onClick={() => handleGenerateApiKey(record)}
          >密钥</Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => {
              confirm({
                title: '删除设备',
                content: '确定要删除此设备吗？',
                onOk: () => handleDelete(record.id),
                okButtonProps: { danger: true },
              });
            }}
          >删除</Button>
        </Space>
      ),
    },
  ], [handleEdit, handleDelete, handleView, handleGenerateApiKey, getStatusTag, safeGateways, generatingKey]);

  const handleCloseDetail = useCallback(() => {
    setIsDetailDrawerVisible(false);
    setSelectedDevice(null);
    setStatistics(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedDevice(null);
    form.resetFields();
  }, [form]);

  return (
    <>
      {/* 统计卡片 */}
      <Card className={styles.card} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard title="设备总数" value={overviewStats.total} icon={<DesktopOutlined />} color="#1890ff" />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard title="在线设备" value={overviewStats.online} icon={<CheckCircleOutlined />} color="#52c41a" />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard title="离线设备" value={overviewStats.offline} icon={<CloseCircleOutlined />} color="#8c8c8c" />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard title="故障设备" value={overviewStats.fault} icon={<ExclamationCircleOutlined />} color="#ff4d4f" />
          </Col>
        </Row>
      </Card>

      {/* 搜索 */}
      <SearchFormCard style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline" onFinish={() => actionRef.current?.reload?.()} style={{ gap: 8 }}>
          <Form.Item name="keyword" style={{ marginBottom: 0 }}>
            <Input placeholder="搜索设备名称/ID" allowClear onPressEnter={() => actionRef.current?.reload?.()} style={{ width: 220 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" onClick={() => actionRef.current?.reload?.()}>搜索</Button>
              <Button onClick={() => { searchForm.resetFields(); actionRef.current?.reload?.(); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      {/* 设备列表 */}
      <DataTable<IoTDevice>
        actionRef={actionRef}
        columns={columns}
        request={fetchDevices}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={{ pageSize: 20, pageSizeOptions: [10, 20, 50, 100] }}
      />

      {/* 新建/编辑弹窗 */}
      <Modal
        title={selectedDevice ? '编辑设备' : '新建设备'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        width={isMobile ? '100%' : 640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="设备名称" name="name" rules={[{ required: true, message: '请输入设备名称' }]}>
                <Input placeholder="请输入设备名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="设备标题" name="title" rules={[{ required: true, message: '请输入设备标题' }]}>
                <Input placeholder="请输入设备标题" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="设备标识符" name="deviceId" tooltip="设备的唯一标识符，不提供则自动生成">
                <Input placeholder="留空则自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="设备类型" name="deviceType" initialValue="Sensor">
                <Select options={DEVICE_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="所属网关" name="gatewayId" tooltip="设备可以独立存在，也可以关联到网关">
                <Select placeholder="请选择所属网关（可选）" allowClear>
                  {safeGateways.map((gateway) => (
                    <Select.Option key={gateway.gatewayId} value={gateway.gatewayId}>
                      {gateway.title}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="物理位置" name="location" tooltip="如: 1号楼/3层/机房A">
                <Input placeholder="如: 1号楼/3层/机房A" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="设备描述" name="description">
            <Input.TextArea rows={2} placeholder="设备描述（可选）" />
          </Form.Item>

          <Form.Item
            label="标签 (Tags)"
            name="tagsList"
            tooltip='格式: "key:value" 或 "key"，支持多个'
          >
            <Select
              mode="tags"
              placeholder='输入标签，格式: "env:prod" 或 "building:A"'
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item
            label="遥测数据保留天数"
            name="retentionDays"
            initialValue={0}
            tooltip="0 表示永久保留，最大 3650 天"
          >
            <InputNumber min={0} max={3650} style={{ width: '100%' }} addonAfter="天（0=永久）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ApiKey 显示弹窗 */}
      <Modal
        title={<><KeyOutlined style={{ color: '#faad14', marginRight: 8 }} />设备 ApiKey 已生成</>}
        open={isApiKeyModalVisible}
        onOk={() => setIsApiKeyModalVisible(false)}
        onCancel={() => setIsApiKeyModalVisible(false)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="我已复制，关闭"
      >
        <Alert
          type="warning"
          showIcon
          message="重要提示"
          description="此密钥仅显示一次，关闭后将无法再次查看。请立即复制并安全保存。"
          style={{ marginBottom: 16 }}
        />
        {apiKeyResult && (
          <>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="设备 ID">{apiKeyResult.deviceId}</Descriptions.Item>
              <Descriptions.Item label="生成时间">
                {dayjs(apiKeyResult.generatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Primary Key（明文）</Text>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  padding: '10px 14px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 6,
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {apiKeyResult.apiKey}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* 设备详情 Drawer */}
      <Drawer
        title={
          <Space>
            <DesktopOutlined />
            设备详情 — {selectedDevice?.title}
            {selectedDevice && getStatusTag(selectedDevice)}
          </Space>
        }
        placement="right"
        onClose={handleCloseDetail}
        open={isDetailDrawerVisible}
        width={isMobile ? '100%' : 900}
        destroyOnClose
      >
        <Spin spinning={false}>
          {selectedDevice ? (
            <Tabs
              defaultActiveKey="info"
              items={[
                {
                  key: 'info',
                  label: <><DesktopOutlined /> 基本信息</>,
                  children: (
                    <>
                      <Card title="设备信息" size="small" className={styles.card} style={{ marginBottom: 12 }}>
                        <Descriptions column={isMobile ? 1 : 2} size="small">
                          <Descriptions.Item label="设备名称" span={2}>{selectedDevice.title}</Descriptions.Item>
                          <Descriptions.Item label="设备 ID">
                            <Text code copyable>{selectedDevice.deviceId}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="设备类型">
                            <Tag color={deviceTypeColor[selectedDevice.deviceType]}>{deviceTypeLabel[selectedDevice.deviceType] ?? selectedDevice.deviceType}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="状态">{getStatusTag(selectedDevice)}</Descriptions.Item>
                          <Descriptions.Item label="启用">
                            <Tag color={selectedDevice.isEnabled ? 'green' : 'red'}>{selectedDevice.isEnabled ? '是' : '否'}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="所属网关">
                            {safeGateways.find((g) => g.gatewayId === selectedDevice.gatewayId)?.title || selectedDevice.gatewayId || <Text type="secondary">独立设备</Text>}
                          </Descriptions.Item>
                          <Descriptions.Item label="物理位置">{selectedDevice.location || <Text type="secondary">-</Text>}</Descriptions.Item>
                          <Descriptions.Item label="描述" span={2}>{selectedDevice.description || <Text type="secondary">-</Text>}</Descriptions.Item>
                          <Descriptions.Item label="标签" span={2}>
                            {selectedDevice.tags && Object.keys(selectedDevice.tags).length > 0 ? (
                              <Space size={4} wrap>
                                {Object.entries(selectedDevice.tags).map(([k, v]) => (
                                  <Tag key={k} color="blue">{k}{v ? `:${v}` : ''}</Tag>
                                ))}
                              </Space>
                            ) : <Text type="secondary">无标签</Text>}
                          </Descriptions.Item>
                          <Descriptions.Item label="数据保留">{selectedDevice.retentionDays === 0 ? '永久保留' : `${selectedDevice.retentionDays} 天`}</Descriptions.Item>
                          <Descriptions.Item label="最后上报">
                            {selectedDevice.lastReportedAt ? dayjs(selectedDevice.lastReportedAt).format('YYYY-MM-DD HH:mm:ss') : <Text type="secondary">-</Text>}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>

                      {/* ApiKey 管理 */}
                      <Card
                        title={<><KeyOutlined style={{ marginRight: 6 }} />认证密钥</>}
                        size="small"
                        className={styles.card}
                        style={{ marginBottom: 12 }}
                        extra={
                          <Button
                            size="small"
                            icon={<KeyOutlined />}
                            loading={generatingKey}
                            onClick={() => handleGenerateApiKey(selectedDevice)}
                          >
                            {selectedDevice.hasApiKey ? '重置密钥' : '生成密钥'}
                          </Button>
                        }
                      >
                        <Alert
                          type={selectedDevice.hasApiKey ? 'success' : 'warning'}
                          showIcon
                          message={selectedDevice.hasApiKey ? '设备 ApiKey 已配置，设备可使用密钥进行认证。' : '设备尚未配置 ApiKey，点击"生成密钥"创建认证凭据。'}
                        />
                      </Card>

                      {/* 统计 */}
                      {statistics && (
                        <Card title="数据统计" size="small" className={styles.card}>
                          <Descriptions column={isMobile ? 1 : 2} size="small">
                            <Descriptions.Item label="数据点总数">{statistics.totalDataPoints}</Descriptions.Item>
                            <Descriptions.Item label="已启用">{statistics.enabledDataPoints}</Descriptions.Item>
                            <Descriptions.Item label="数据记录">{statistics.totalDataRecords}</Descriptions.Item>
                            <Descriptions.Item label="未处理告警">
                              <Tag color={statistics.unhandledAlarms > 0 ? 'red' : 'green'}>{statistics.unhandledAlarms}</Tag>
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                      )}
                    </>
                  ),
                },
                {
                  key: 'twin',
                  label: <><BranchesOutlined /> 设备孪生</>,
                  children: <DeviceTwinPanel deviceId={selectedDevice.deviceId} />,
                },
                {
                  key: 'commands',
                  label: <><SendOutlined /> 命令控制</>,
                  children: <CommandCenterPanel deviceId={selectedDevice.deviceId} />,
                },
              ]}
            />
          ) : (
            <Empty description="未加载设备信息" />
          )}
        </Spin>
      </Drawer>
    </>
  );
});

DeviceManagement.displayName = 'DeviceManagement';
export default DeviceManagement;
