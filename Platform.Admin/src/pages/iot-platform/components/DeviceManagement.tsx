import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useIntl } from '@umijs/max';
import type { ActionType, ProColumns } from '@/types/pro-components';
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
} from 'antd';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  iotService,
  IoTDevice,
  IoTGateway,
  DeviceStatistics,
} from '@/services/iotService';
import { StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchFormCard from '@/components/SearchFormCard';
import { useModal } from '@/hooks/useModal';

export interface DeviceManagementRef {
  reload: () => void;
  refreshStats: () => void;
  handleAdd: () => void;
}

// 提取纯函数到组件外部
const isDeviceOnline = (device: IoTDevice) => {
  if (!device.lastReportedAt) return false;
  const reportedAt = new Date(device.lastReportedAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - reportedAt.getTime()) / (1000 * 60);
  return diffMinutes <= 5;
};

const DeviceManagement = forwardRef<DeviceManagementRef>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const { styles } = useCommonStyles();
  const actionRef = useRef<ActionType>(null);
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [statistics, setStatistics] = useState<DeviceStatistics | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    fault: 0,
  });
  const [searchForm] = Form.useForm();

  // 确保 gateways 始终是数组
  const safeGateways = Array.isArray(gateways) ? gateways : [];

  // 获取概览统计
  const fetchOverviewStats = useCallback(async () => {
    try {
      // 获取所有设备用于统计
      const response = await iotService.getDevices(undefined, 1, 1000);
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setOverviewStats({
          total: list.length,
          online: list.filter((d: IoTDevice) => isDeviceOnline(d)).length,
          offline: list.filter((d: IoTDevice) => !isDeviceOnline(d)).length,
          fault: 0, // 不再维护故障状态
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  // 获取设备列表（用于 ProTable）
  const fetchDevices = useCallback(async (params: any) => {
    try {
      const { keyword } = searchForm.getFieldsValue();
      const response = await iotService.getDevices(undefined, params.current || 1, params.pageSize || 20, keyword);
      if (response.success && response.data) {
        const data = response.data;
        const list = Array.isArray(data.list) ? data.list : [];
        return {
          data: list,
          success: true,
          total: data.total || 0,
        };
      }
      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error) {
      console.error('加载设备列表失败:', error);
      message.error('加载设备列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  }, []);

  const loadGateways = useCallback(async () => {
    try {
      const response = await iotService.getGateways(1, 1000); // 加载所有网关用于下拉选择
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setGateways(list);
      } else {
        setGateways([]);
      }
    } catch (error) {
      console.error('Failed to load gateways:', error);
      setGateways([]);
    }
  }, []);

  // 初始化：加载网关和统计信息
  useEffect(() => {
    loadGateways();
    fetchOverviewStats();
  }, [loadGateways, fetchOverviewStats]);

  const handleAdd = useCallback(() => {
    form.resetFields();
    setSelectedDevice(null);
    setIsModalVisible(true);
  }, [form]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      if (actionRef.current?.reload) {
        actionRef.current.reload();
      }
    },
    refreshStats: () => {
      fetchOverviewStats();
    },
    handleAdd,
  }), [fetchOverviewStats, handleAdd]);

  const handleEdit = useCallback((device: IoTDevice) => {
    setSelectedDevice(device);
    form.setFieldsValue(device);
    setIsModalVisible(true);
  }, [form]);

  const handleView = useCallback(async (device: IoTDevice) => {
    setSelectedDevice(device);
    try {
      const response = await iotService.getDeviceStatistics(device.deviceId);
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
    setIsDetailDrawerVisible(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await iotService.deleteDevice(id);
      if (response.success) {
        message.success('删除成功');
        if (actionRef.current?.reload) {
          actionRef.current.reload();
        }
        fetchOverviewStats();
      }
    } catch (error) {
      message.error('删除失败');
    }
  }, [fetchOverviewStats]);

  const handleSubmit = useCallback(async (values: any) => {
    try {
      if (selectedDevice) {
        const response = await iotService.updateDevice(selectedDevice.id, values);
        if (response.success) {
          message.success('更新成功');
        }
      } else {
        const response = await iotService.createDevice(values);
        if (response.success) {
          message.success('创建成功');
        }
      }
      handleCloseModal();
      if (actionRef.current?.reload) {
        actionRef.current.reload();
      }
      fetchOverviewStats();
    } catch (error) {
      message.error('操作失败');
    }
  }, [selectedDevice, fetchOverviewStats]);

  const getStatusTag = useCallback((device: IoTDevice) => {
    const online = isDeviceOnline(device);
    return <Tag color={online ? 'green' : 'default'}>{online ? '在线' : '离线'}</Tag>;
  }, []);

  const columns: TableColumnsType<IoTDevice> = useMemo(() => [
    {
      title: '设备名称',
      dataIndex: 'title',
      key: 'title',
      width: 150,
      render: (text, record) => (
        <a
          onClick={() => handleView(record)}
          style={{ cursor: 'pointer' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '所属网关',
      dataIndex: 'gatewayId',
      key: 'gatewayId',
      width: 150,
      render: (gatewayId: string) => {
        const gateway = safeGateways.find((g) => g.gatewayId === gatewayId);
        return gateway?.title || gatewayId;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, device: IoTDevice) => getStatusTag(device),
    },
    {
      title: '启用',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 80,
      render: (isEnabled: boolean) => (
        <Tag color={isEnabled ? 'green' : 'red'}>{isEnabled ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: any, record: IoTDevice) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              confirm({
                title: '删除设备',
                content: '确定要删除此设备吗？',
                onOk: () => handleDelete(record.id),
                okButtonProps: { danger: true },
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ], [handleEdit, handleDelete, handleView, getStatusTag, safeGateways]);

  // 关闭详情抽屉
  const handleCloseDetail = useCallback(() => {
    setIsDetailDrawerVisible(false);
    setSelectedDevice(null);
    setStatistics(null);
  }, []);

  // 关闭表单弹窗
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedDevice(null);
    form.resetFields();
  }, [form]);

  return (
    <>
      {/* 统计卡片：与其他页面保持一致的紧凑横向布局 */}
      <Card className={styles.card} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="设备总数"
              value={overviewStats.total}
              icon={<DesktopOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.iotPlatform.status.onlineDevices' })}
              value={overviewStats.online}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.iotPlatform.status.offlineDevices' })}
              value={overviewStats.offline}
              icon={<CloseCircleOutlined />}
              color="#8c8c8c"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.iotPlatform.status.faultDevices' })}
              value={overviewStats.fault}
              icon={<ExclamationCircleOutlined />}
              color="#ff4d4f"
            />
          </Col>
        </Row>
      </Card>

      {/* 搜索表单 */}
      <SearchFormCard style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={() => actionRef.current?.reload?.()}
          style={{ gap: 8 }}
        >
          <Form.Item name="keyword" style={{ marginBottom: 0 }}>
            <Input
              placeholder={intl.formatMessage({ id: 'pages.iotPlatform.search.placeholder' })}
              allowClear
              onPressEnter={() => actionRef.current?.reload?.()}
              style={{ width: 220 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" onClick={() => actionRef.current?.reload?.()}>
                {intl.formatMessage({ id: 'pages.button.search' })}
              </Button>
              <Button
                onClick={() => {
                  searchForm.resetFields();
                  actionRef.current?.reload?.();
                }}
              >
                {intl.formatMessage({ id: 'pages.button.reset' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      {/* 设备列表表格 */}
      <DataTable<IoTDevice>
        actionRef={actionRef}
        columns={columns}
        request={fetchDevices}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={{
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <Modal
        title={selectedDevice ? '编辑设备' : '新建设备'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        width={isMobile ? '100%' : 600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="设备名称"
            name="name"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="请输入设备名称" />
          </Form.Item>

          <Form.Item
            label="设备标题"
            name="title"
            rules={[{ required: true, message: '请输入设备标题' }]}
          >
            <Input placeholder="请输入设备标题" />
          </Form.Item>

          <Form.Item
            label="设备标识符"
            name="deviceId"
            tooltip="设备的唯一标识符，不提供则自动生成"
          >
            <Input placeholder="留空则自动生成" />
          </Form.Item>

          <Form.Item
            label="所属网关"
            name="gatewayId"
            tooltip="设备可以独立存在，也可以关联到网关"
          >
            <Select placeholder="请选择所属网关（可选）" allowClear>
              {safeGateways.map((gateway) => (
                <Select.Option key={gateway.gatewayId} value={gateway.gatewayId}>
                  {gateway.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="设备详情"
        placement="right"
        onClose={handleCloseDetail}
        open={isDetailDrawerVisible}
        size={typeof window !== 'undefined' && window.innerWidth < 768 ? 'large' : 800}
      >
        <Spin spinning={false}>
          {selectedDevice ? (
            <>
              {/* 基本信息 */}
              <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2} size="small">
                  <Descriptions.Item label="设备名称" span={2}>
                    {selectedDevice.title}
                  </Descriptions.Item>
                  <Descriptions.Item label="设备ID">
                    {selectedDevice.deviceId}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {getStatusTag(selectedDevice)}
                  </Descriptions.Item>
                  <Descriptions.Item label="所属网关">
                    {(() => {
                      const gateway = safeGateways.find((g) => g.gatewayId === selectedDevice.gatewayId);
                      return gateway?.title || selectedDevice.gatewayId || '-';
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="启用状态">
                    <Tag color={selectedDevice.isEnabled ? 'green' : 'red'}>
                      {selectedDevice.isEnabled ? '是' : '否'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 统计信息 */}
              {statistics && (
                <Card title="数据点统计" className={styles.card} style={{ marginBottom: 16 }}>
                  <Descriptions column={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2} size="small">
                    <Descriptions.Item label="总数">
                      {statistics.totalDataPoints}
                    </Descriptions.Item>
                    <Descriptions.Item label="已启用">
                      {statistics.enabledDataPoints}
                    </Descriptions.Item>
                    <Descriptions.Item label="数据记录">
                      {statistics.totalDataRecords}
                    </Descriptions.Item>
                    <Descriptions.Item label="未处理告警">
                      <Tag color={statistics.unhandledAlarms > 0 ? 'red' : 'green'}>
                        {statistics.unhandledAlarms}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {/* 时间信息 */}
              <Card title="时间信息" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2} size="small">
                  <Descriptions.Item label="最后上报时间">
                    {selectedDevice.lastReportedAt
                      ? dayjs(selectedDevice.lastReportedAt).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {dayjs(selectedDevice.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </>
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

