import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Button,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    DatePicker,
    Select,
    App,
    Typography,
    Card,
    Row,
    Col,
    Grid,
    Empty,
    Drawer,
    Descriptions,
    Popconfirm,
    Divider,
} from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    UserOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    CloseCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    SendOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import SearchFormCard from '@/components/SearchFormCard';
import * as visitService from '@/services/visit';
import { getTenants } from '@/services/park';
import type { ParkTenant } from '@/services/park';
import type { VisitTask as VisitTaskType, VisitStatistics } from '@/services/visit';
import dayjs from 'dayjs';
import styles from './index.less';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const VisitTask: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const [form] = Form.useForm();
    const [searchForm] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState<VisitTaskType | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<VisitTaskType | null>(null);
    const [statistics, setStatistics] = useState<VisitStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const actionRef = useRef<any>(null);
    const [tenants, setTenants] = useState<ParkTenant[]>([]);
    const screens = useBreakpoint();

    const loadTenants = useCallback(async () => {
        try {
            const res = await getTenants({ page: 1, pageSize: 100 });
            if (res.success && res.data) {
                setTenants(res.data.tenants);
            }
        } catch (error) {
            console.error('Failed to load tenants:', error);
        }
    }, []);

    useEffect(() => {
        loadTenants();
    }, [loadTenants]);

    const loadStatistics = useCallback(async () => {
        try {
            const res = await visitService.getVisitStatistics();
            if (res.success && res.data) {
                setStatistics(res.data);
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }, []);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const statusMap: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
        'Pending': { text: '待派发', color: 'orange', icon: <SyncOutlined spin /> },
        'InProgress': { text: '进行中', color: 'blue', icon: <SyncOutlined spin /> },
        'Completed': { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
        'Cancelled': { text: '已取消', color: 'error', icon: <CloseCircleOutlined /> },
    };

    const columns = [
        {
            title: '企管员',
            dataIndex: 'managerName',
            key: 'managerName',
            width: 150,
            render: (text: string, record: VisitTaskType) => (
                <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <a onClick={() => { setSelectedTask(record); setDetailVisible(true); }}>
                        {text}
                    </a>
                </Space>
            ),
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            key: 'phone',
            width: 130,
        },
        {
            title: '管辖范围',
            dataIndex: 'jurisdiction',
            key: 'jurisdiction',
            ellipsis: true,
        },
        {
            title: '受访企业',
            dataIndex: 'tenantName',
            key: 'tenantName',
            render: (text: string) => text || '-',
        },
        {
            title: '走访日期',
            dataIndex: 'visitDate',
            key: 'visitDate',
            width: 120,
            render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const config = statusMap[status] || { text: status, color: 'default', icon: null };
                return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_: any, record: VisitTaskType) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => { setSelectedTask(record); setDetailVisible(true); }}
                    >
                        查看
                    </Button>
                    {record.status === 'Pending' && (
                        <Popconfirm
                            title="确定要派发该走访任务吗？"
                            onConfirm={() => handleDispatch(record.id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button
                                type="link"
                                size="small"
                                icon={<SendOutlined />}
                            >
                                派发
                            </Button>
                        </Popconfirm>
                    )}
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => { setEditingTask(record); form.setFieldsValue({ ...record, visitDate: record.visitDate ? dayjs(record.visitDate) : undefined }); setIsModalVisible(true); }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定要删除这条走访任务吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleDelete = async (id: string) => {
        try {
            const res = await visitService.deleteTask(id);
            if (res.success) {
                message.success('删除成功');
                actionRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            message.error('删除失败');
        }
    };

    const handleDispatch = async (id: string) => {
        try {
            setLoading(true);
            const res = await visitService.dispatchTask(id);
            if (res.success) {
                message.success('派发成功');
                actionRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            message.error('派发失败');
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const submitData = {
                ...values,
                visitDate: values.visitDate ? values.visitDate.toISOString() : undefined,
            };

            const res = editingTask
                ? await visitService.updateTask(editingTask.id, submitData)
                : await visitService.createTask(submitData);

            if (res.success) {
                message.success(editingTask ? '修改成功' : '添加成功');
                setIsModalVisible(false);
                setEditingTask(null);
                form.resetFields();
                actionRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            console.error('Validate Failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        actionRef.current?.reload();
    };

    const handleReset = () => {
        searchForm.resetFields();
        handleSearch();
    };

    return (
        <PageContainer
            title="走访任务管理"
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => { actionRef.current?.reload(); loadStatistics(); }}>
                        刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTask(null); form.resetFields(); setIsModalVisible(true); }}>
                        新增任务
                    </Button>
                </Space>
            }
        >
            {statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="待处理任务"
                            value={statistics.pendingTasks}
                            icon={<SyncOutlined />}
                            color="#faad14"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="本月走访数"
                            value={statistics.completedTasksThisMonth}
                            icon={<CheckCircleOutlined />}
                            color="#52c41a"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="活跃企管员"
                            value={statistics.activeManagers}
                            icon={<UserOutlined />}
                            color="#1890ff"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="完成率"
                            value={`${statistics.completionRate}%`}
                            icon={<SyncOutlined />}
                            color={statistics.completionRate >= 90 ? '#52c41a' : '#faad14'}
                        />
                    </Col>
                </Row>
            )}

            <SearchFormCard>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="search">
                        <Input placeholder="搜索关键字..." style={{ width: 200 }} allowClear />
                    </Form.Item>
                    <Form.Item name="status">
                        <Select placeholder="状态" style={{ width: 120 }} allowClear>
                            <Select.Option value="Pending">待派发</Select.Option>
                            <Select.Option value="InProgress">进行中</Select.Option>
                            <Select.Option value="Completed">已完成</Select.Option>
                            <Select.Option value="Cancelled">已取消</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">搜索</Button>
                            <Button onClick={handleReset} icon={<ReloadOutlined />}>重置</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </SearchFormCard>

            <Card>
                <DataTable<VisitTaskType>
                    columns={columns as any}
                    request={async (params: any) => {
                        const searchValues = searchForm.getFieldsValue();
                        const res = await visitService.getTasks({
                            page: params.current || 1,
                            pageSize: params.pageSize || 10,
                            ...searchValues,
                        });
                        if (res.success && res.data) {
                            return { data: res.data.tasks, total: res.data.total, success: true };
                        }
                        return { data: [], total: 0, success: false };
                    }}
                    actionRef={actionRef}
                    rowKey="id"
                    search={false}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title={editingTask ? '编辑走访任务' : '新增走访任务'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => { setIsModalVisible(false); setEditingTask(null); form.resetFields(); }}
                width={640}
                confirmLoading={loading}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="managerName" label="企管员姓名" rules={[{ required: true, message: '请输入企管员姓名' }]}>
                                <Input placeholder="请输入姓名" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                                <Input placeholder="请输入手机号" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="jurisdiction" label="管辖范围">
                        <Input.TextArea rows={2} placeholder="请输入管辖范围" />
                    </Form.Item>
                    <Form.Item name="tenantId" label="受访企业">
                        <Select placeholder="请选择企业" allowClear showSearch optionFilterProp="label">
                            {tenants.map(tenant => (
                                <Select.Option key={tenant.id} value={tenant.id} label={tenant.tenantName}>
                                    {tenant.tenantName}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="visitLocation" label="走访地点">
                                <Input placeholder="请输入走访地点" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="visitDate" label="走访日期">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="details" label="任务详情">
                        <Input.TextArea rows={3} placeholder="请输入任务详情" />
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title="走访任务详情"
                open={detailVisible}
                onClose={() => setDetailVisible(false)}
                width={640}
                extra={
                    <Space>
                        <Button onClick={() => setDetailVisible(false)}>关闭</Button>
                        <Button type="primary" icon={<EditOutlined />} onClick={() => { setDetailVisible(false); setEditingTask(selectedTask); form.setFieldsValue({ ...selectedTask, visitDate: selectedTask?.visitDate ? dayjs(selectedTask.visitDate) : undefined }); setIsModalVisible(true); }}>编辑</Button>
                    </Space>
                }
            >
                {selectedTask ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Descriptions title="基本信息" bordered column={1}>
                            <Descriptions.Item label="企管员">{selectedTask.managerName}</Descriptions.Item>
                            <Descriptions.Item label="联系电话">{selectedTask.phone}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={statusMap[selectedTask.status]?.color} icon={statusMap[selectedTask.status]?.icon}>
                                    {statusMap[selectedTask.status]?.text}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="创建时间">{dayjs(selectedTask.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Descriptions title="任务内容" bordered column={1}>
                            <Descriptions.Item label="管辖范围">{selectedTask.jurisdiction || '-'}</Descriptions.Item>
                            <Descriptions.Item label="受访企业">{selectedTask.tenantName || '-'}</Descriptions.Item>
                            <Descriptions.Item label="走访地点">{selectedTask.visitLocation || '-'}</Descriptions.Item>
                            <Descriptions.Item label="走访日期">{selectedTask.visitDate ? dayjs(selectedTask.visitDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                            <Descriptions.Item label="详情说明">
                                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.details || '-'}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Space>
                ) : <Empty />}
            </Drawer>
        </PageContainer>
    );
};

// Simplified intlInstance to avoid useIntl directly in the component if preferred, but useIntl is standard Umi
const intlInstance = () => {
    try {
        const { useIntl: useUmiIntl } = require('@umijs/max');
        return useUmiIntl();
    } catch {
        return { formatMessage: ({ defaultMessage }: any) => defaultMessage };
    }
};

export default VisitTask;
