import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { ActionType, ProColumns } from '@/types/pro-components';
import DataTable from '@/components/DataTable';
import {
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  App,
  Drawer,
  Tag,
  Popconfirm,
  Switch,
  Card,
  Row,
  Col,
  Descriptions,
  Spin,
  Empty,
  Typography,
  type TableColumnsType,
} from 'antd';

const { Paragraph } = Typography;
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { iotService, IoTDataPoint, IoTDevice } from '@/services/iotService';
import { StatCard } from '@/components';

export interface DataPointManagementRef {
  reload: () => void;
  refreshStats: () => void;
  handleAdd: () => void;
}

const DataPointManagement = forwardRef<DataPointManagementRef>((props, ref) => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<IoTDataPoint | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    withAlarm: 0,
  });

  // 确保 devices 始终是数组
  const safeDevices = Array.isArray(devices) ? devices : [];

  useEffect(() => {
    loadDevices();
    fetchOverviewStats();
  }, []);

  // 获取概览统计
  const fetchOverviewStats = async () => {
    try {
      // 获取所有数据点用于统计
      const response = await iotService.getDataPoints(undefined, 1, 1000);
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setOverviewStats({
          total: list.length,
          enabled: list.filter((dp: IoTDataPoint) => dp.isEnabled).length,
          disabled: list.filter((dp: IoTDataPoint) => !dp.isEnabled).length,
          withAlarm: list.filter((dp: IoTDataPoint) => dp.alarmConfig?.isEnabled).length,
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 获取数据点列表（用于 ProTable）
  const fetchDataPoints = async (params: any) => {
    try {
      const response = await iotService.getDataPoints(undefined, params.current || 1, params.pageSize || 20);
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
      console.error('加载数据点列表失败:', error);
      message.error('加载数据点列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  const loadDevices = async () => {
    try {
      const response = await iotService.getDevices(undefined, 1, 1000); // 加载所有设备用于下拉选择
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setDevices(list);
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      setDevices([]);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setSelectedDataPoint(null);
    setIsModalVisible(true);
  };

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
  }));

  const handleEdit = (dataPoint: IoTDataPoint) => {
    setSelectedDataPoint(dataPoint);
    form.setFieldsValue(dataPoint);
    setIsModalVisible(true);
  };

  const handleView = (dataPoint: IoTDataPoint) => {
    setSelectedDataPoint(dataPoint);
    setIsDetailDrawerVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await iotService.deleteDataPoint(id);
      if (response.success) {
        message.success('删除成功');
        // 确保刷新操作执行
        setTimeout(() => {
          if (actionRef.current?.reload) {
            actionRef.current.reload();
          }
          fetchOverviewStats();
        }, 100);
      } else {
        message.error((response as any).errorMessage || '删除失败');
      }
    } catch (error: any) {
      console.error('删除数据点失败:', error);
      message.error(error?.message || '删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (selectedDataPoint) {
        const response = await iotService.updateDataPoint(selectedDataPoint.id, values);
        if (response.success) {
          message.success('更新成功');
        } else {
          message.error((response as any).errorMessage || '更新失败');
          return;
        }
      } else {
        const response = await iotService.createDataPoint(values);
        if (response.success) {
          message.success('创建成功');
        } else {
          message.error((response as any).errorMessage || '创建失败');
          return;
        }
      }
      setIsModalVisible(false);
      // 确保刷新操作执行
      setTimeout(() => {
        if (actionRef.current?.reload) {
          actionRef.current.reload();
        }
        fetchOverviewStats();
      }, 100);
    } catch (error: any) {
      console.error('操作失败:', error);
      message.error(error?.message || '操作失败');
    }
  };

  const getDataTypeLabel = (type: string) => {
    // 支持 camelCase (后端返回) 和首字母大写格式
    const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    const typeMap: Record<string, string> = {
      Numeric: '数值',
      Boolean: '布尔',
      String: '字符串',
      Enum: '枚举',
      Json: 'JSON',
    };
    return typeMap[normalizedType] || type;
  };

  const columns: TableColumnsType<IoTDataPoint> = [
    {
      title: '数据点名称',
      dataIndex: 'title',
      key: 'title',
      width: 150,
      ellipsis: true,
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
      title: '所属设备',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 150,
      render: (deviceId: string) => {
        const device = safeDevices.find((d) => d.deviceId === deviceId);
        return device?.title || deviceId;
      },
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (type: string) => getDataTypeLabel(type),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '采样间隔(秒)',
      dataIndex: 'samplingInterval',
      key: 'samplingInterval',
      width: 120,
    },
    {
      title: '最后采集值',
      dataIndex: 'lastValue',
      key: 'lastValue',
      width: 150,
      render: (value: string, record: IoTDataPoint) => {
        if (!value) {
          return <span style={{ color: '#999' }}>暂无数据</span>;
        }
        // 如果是 JSON 类型，尝试格式化显示
        if (record.dataType?.toLowerCase() === 'json') {
          try {
            const parsed = JSON.parse(value);
            const preview = JSON.stringify(parsed).substring(0, 50);
            return (
              <span title={value} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {preview}
                {value.length > 50 ? '...' : ''}
              </span>
            );
          } catch {
            return <span title={value}>{value.substring(0, 30)}{value.length > 30 ? '...' : ''}</span>;
          }
        }
        return (
          <span title={value}>
            {value}
            {record.unit && <span style={{ color: '#999', marginLeft: 4 }}>{record.unit}</span>}
          </span>
        );
      },
    },
    {
      title: '最后采集时间',
      dataIndex: 'lastUpdatedAt',
      key: 'lastUpdatedAt',
      width: 180,
      sorter: true,
      render: (time: string) => {
        if (!time) {
          return <span style={{ color: '#999' }}>暂无</span>;
        }
        const date = new Date(time);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        let timeAgo = '';
        if (diffMins < 1) {
          timeAgo = '刚刚';
        } else if (diffMins < 60) {
          timeAgo = `${diffMins}分钟前`;
        } else if (diffHours < 24) {
          timeAgo = `${diffHours}小时前`;
        } else if (diffDays < 7) {
          timeAgo = `${diffDays}天前`;
        } else {
          timeAgo = '';
        }
        
        return (
          <div>
            <div>{date.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}</div>
            {timeAgo && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>
                {timeAgo}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '告警配置',
      dataIndex: 'alarmConfig',
      key: 'alarmConfig',
      width: 100,
      render: (alarmConfig: any) => {
        if (alarmConfig?.isEnabled) {
          return <Tag color="orange">已配置</Tag>;
        }
        return <Tag color="default">未配置</Tag>;
      },
    },
    {
      title: '启用状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? 'success' : 'default'}>
          {value ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: any, record: IoTDataPoint) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除数据点"
            description="确定要删除此数据点吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* 统计卡片：与其他页面保持一致的紧凑横向布局 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="数据点总数"
              value={overviewStats.total}
              icon={<DatabaseOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="已启用"
              value={overviewStats.enabled}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="已禁用"
              value={overviewStats.disabled}
              icon={<CloseCircleOutlined />}
              color="#8c8c8c"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="告警配置"
              value={overviewStats.withAlarm}
              icon={<ExclamationCircleOutlined />}
              color="#faad14"
            />
          </Col>
        </Row>
      </Card>

      {/* 数据点配置列表表格 */}
      <DataTable<IoTDataPoint>
        actionRef={actionRef}
        columns={columns}
        request={fetchDataPoints}
        rowKey="id"
        pagination={{
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <Modal
        title={selectedDataPoint ? '编辑数据点' : '新建数据点'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="数据点名称"
            name="name"
            rules={[{ required: true, message: '请输入数据点名称' }]}
          >
            <Input placeholder="请输入数据点名称" />
          </Form.Item>

          <Form.Item
            label="数据点标题"
            name="title"
            rules={[{ required: true, message: '请输入数据点标题' }]}
          >
            <Input placeholder="请输入数据点标题" />
          </Form.Item>

          <Form.Item
            label="所属设备"
            name="deviceId"
            rules={[{ required: true, message: '请选择所属设备' }]}
          >
            <Select placeholder="请选择所属设备">
              {safeDevices.map((device) => (
                <Select.Option key={device.deviceId} value={device.deviceId}>
                  {device.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="数据类型"
            name="dataType"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="请选择数据类型">
              <Select.Option value="Numeric">数值</Select.Option>
              <Select.Option value="Boolean">布尔</Select.Option>
              <Select.Option value="String">字符串</Select.Option>
              <Select.Option value="Enum">枚举</Select.Option>
              <Select.Option value="Json">JSON</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="单位" name="unit">
            <Input placeholder="请输入单位" />
          </Form.Item>

          <Form.Item label="最小值" name="minValue">
            <InputNumber placeholder="请输入最小值" />
          </Form.Item>

          <Form.Item label="最大值" name="maxValue">
            <InputNumber placeholder="请输入最大值" />
          </Form.Item>

          <Form.Item label="精度" name="precision" initialValue={2}>
            <InputNumber placeholder="请输入精度" min={0} max={10} />
          </Form.Item>

          <Form.Item label="采样间隔(秒)" name="samplingInterval" initialValue={60}>
            <InputNumber placeholder="请输入采样间隔" min={1} />
          </Form.Item>

          <Form.Item label="只读" name="isReadOnly" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Form.Item label="启用" name="isEnabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="请输入描述" rows={2} />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <Input.TextArea placeholder="请输入备注" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="数据点详情"
        placement="right"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
        size={800}
      >
        <Spin spinning={false}>
          {selectedDataPoint ? (
            <>
              {/* 基本信息 */}
              <Card title="基本信息" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="数据点名称" span={2}>
                    {selectedDataPoint.title}
                  </Descriptions.Item>
                  <Descriptions.Item label="数据点ID">
                    {selectedDataPoint.dataPointId}
                  </Descriptions.Item>
                  <Descriptions.Item label="所属设备">
                    {(() => {
                      const device = safeDevices.find((d) => d.deviceId === selectedDataPoint.deviceId);
                      return device?.title || selectedDataPoint.deviceId || '-';
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="数据类型">
                    <Tag>{getDataTypeLabel(selectedDataPoint.dataType)}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="单位">
                    {selectedDataPoint.unit || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="采样间隔">
                    {selectedDataPoint.samplingInterval} 秒
                  </Descriptions.Item>
                  <Descriptions.Item label="只读">
                    <Tag color={selectedDataPoint.isReadOnly ? 'orange' : 'green'}>
                      {selectedDataPoint.isReadOnly ? '是' : '否'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="启用状态">
                    <Tag color={selectedDataPoint.isEnabled ? 'green' : 'red'}>
                      {selectedDataPoint.isEnabled ? '启用' : '禁用'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 数值范围 */}
              {(selectedDataPoint.minValue !== undefined || selectedDataPoint.maxValue !== undefined) && (
                <Card title="数值范围" style={{ marginBottom: 16 }}>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="最小值">
                      {selectedDataPoint.minValue !== undefined ? selectedDataPoint.minValue : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="最大值">
                      {selectedDataPoint.maxValue !== undefined ? selectedDataPoint.maxValue : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {/* 告警配置 */}
              {selectedDataPoint.alarmConfig?.isEnabled && (
                <Card title="告警配置" style={{ marginBottom: 16 }}>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="告警状态">
                      <Tag color="orange">已启用</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="告警类型">
                      {selectedDataPoint.alarmConfig.alarmType || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="阈值">
                      {selectedDataPoint.alarmConfig.threshold || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="级别">
                      {selectedDataPoint.alarmConfig.level || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {/* 最后采集数据 */}
              <Card title="最后采集数据" style={{ marginBottom: 16 }}>
                {selectedDataPoint.lastValue ? (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="数据值">
                      {selectedDataPoint.dataType?.toLowerCase() === 'json' ? (
                        (() => {
                          try {
                            const parsed = JSON.parse(selectedDataPoint.lastValue);
                            const formattedJson = JSON.stringify(parsed, null, 2);
                            return (
                              <Paragraph
                                copyable={{ text: selectedDataPoint.lastValue }}
                                style={{
                                  width: '100%',
                                  maxHeight: 400,
                                  overflow: 'auto',
                                  fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, Menlo, monospace',
                                  whiteSpace: 'pre-wrap',
                                  marginBottom: 0,
                                }}
                              >
                                {formattedJson}
                              </Paragraph>
                            );
                          } catch (error) {
                            return (
                              <div style={{ wordBreak: 'break-all', color: '#ff4d4f' }}>
                                {selectedDataPoint.lastValue}
                                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                  (JSON 解析失败，显示原始值)
                                </div>
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <div>
                          {selectedDataPoint.lastValue}
                          {selectedDataPoint.unit && (
                            <span style={{ color: '#999', marginLeft: 4 }}>{selectedDataPoint.unit}</span>
                          )}
                        </div>
                      )}
                    </Descriptions.Item>
                    {selectedDataPoint.lastUpdatedAt && (
                      <Descriptions.Item label="采集时间">
                        {dayjs(selectedDataPoint.lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无采集数据
                  </div>
                )}
              </Card>

              {/* 时间信息 */}
              <Card title="时间信息" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="创建时间">
                    {dayjs(selectedDataPoint.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </>
          ) : (
            <Empty description="未加载数据点信息" />
          )}
        </Spin>
      </Drawer>
    </>
  );
});

DataPointManagement.displayName = 'DataPointManagement';

export default DataPointManagement;

