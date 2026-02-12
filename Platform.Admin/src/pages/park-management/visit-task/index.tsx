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
    AutoComplete,
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

    useEffect(() => {
        if (isModalVisible) {
            if (editingTask) {
                form.setFieldsValue({
                    ...editingTask,
                    visitDate: editingTask.visitDate ? dayjs(editingTask.visitDate) : undefined
                });
            } else {
                // 新建任务时设置默认走访时间为当前时间
                form.setFieldsValue({
                    visitDate: dayjs()
                });
            }
        }
    }, [isModalVisible, editingTask, form]);

    const statusMap: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
        'Pending': { text: '待派发', color: 'orange', icon: <SyncOutlined spin /> },
        'InProgress': { text: '进行中', color: 'blue', icon: <SyncOutlined spin /> },
        'Completed': { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
        'Cancelled': { text: '已取消', color: 'error', icon: <CloseCircleOutlined /> },
    };

    const columns = [
        {
            title: '任务标题',
            dataIndex: 'title',
            key: 'title',
            width: 200,
            ellipsis: true,
            render: (text: string, record: VisitTaskType) => (
                <a onClick={() => { setSelectedTask(record); setDetailVisible(true); }}>
                    {text}
                </a>
            ),
        },
        {
            title: '走访类型',
            dataIndex: 'visitType',
            key: 'visitType',
            width: 120,
        },
        {
            title: '受访企业',
            dataIndex: 'tenantName',
            key: 'tenantName',
            width: 150,
            ellipsis: true,
            render: (text: string) => text || '-',
        },
        {
            title: '企管员',
            dataIndex: 'managerName',
            key: 'managerName',
            width: 120,
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
            width: 160,
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


                    {record.status !== 'Completed' && (
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => { 
                                setEditingTask(record); 
                                form.setFieldsValue({ 
                                    ...record, 
                                    visitDate: record.visitDate ? dayjs(record.visitDate) : dayjs() 
                                }); 
                                setIsModalVisible(true); 
                            }}
                        >
                            编辑
                        </Button>
                    )}

                    {record.status !== 'Completed' && (
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
                    )}
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



    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Resolve Tenant ID from TenantName
            const targetTenant = tenants.find(t => t.tenantName === values.tenantName);
            let finalTenantId = targetTenant?.id;

            // Protection: If editing and name hasn't changed, preserve original ID 
            // (addresses case where tenant is not in the loaded 'tenants' list)
            if (editingTask && values.tenantName === editingTask.tenantName) {
                finalTenantId = editingTask.tenantId;
            }

            const submitData = {
                ...values,
                visitDate: values.visitDate.toISOString(), // 现在是必填字段，确保有值
                tenantId: finalTenantId,
                tenantName: values.tenantName,
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
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTask(null); setIsModalVisible(true); }}>
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
                        <Input placeholder="任务标题/企管员/手机号" style={{ width: 220 }} allowClear />
                    </Form.Item>
                    <Form.Item name="visitType">
                        <Select placeholder="走访类型" style={{ width: 140 }} allowClear>
                            <Select.Option value="日常走访">日常走访</Select.Option>
                            <Select.Option value="安全检查">安全检查</Select.Option>
                            <Select.Option value="政策宣讲">政策宣讲</Select.Option>
                            <Select.Option value="需求调研">需求调研</Select.Option>
                        </Select>
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
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Divider>基本信息</Divider>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入任务标题' }]}>
                                <Input placeholder="如：XX企业日常走访" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="managerName" label="企管员" rules={[{ required: true, message: '请输入企管员姓名' }]}>
                                <Input placeholder="请输入姓名" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="手机号">
                                <Input placeholder="请输入手机号" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="visitType" label="走访类型" initialValue="日常走访">
                                <Select>
                                    <Select.Option value="日常走访">日常走访</Select.Option>
                                    <Select.Option value="安全检查">安全检查</Select.Option>
                                    <Select.Option value="政策宣讲">政策宣讲</Select.Option>
                                    <Select.Option value="需求调研">需求调研</Select.Option>
                                    <Select.Option value="其他">其他</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="visitMethod" label="走访方式" initialValue="实地走访">
                                <Select>
                                    <Select.Option value="实地走访">实地走访</Select.Option>
                                    <Select.Option value="电话沟通">电话沟通</Select.Option>
                                    <Select.Option value="微信联系">微信联系</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="details" label="计划说明">
                        <Input.TextArea rows={2} placeholder="请输入计划说明或初始备注" />
                    </Form.Item>

                    <Divider>企业与受访人</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="tenantName" label="受访企业" rules={[{ required: true, message: '请输入或选择受访企业' }]}>
                                <AutoComplete
                                    placeholder="请输入或选择企业"
                                    options={tenants.map(t => ({ value: t.tenantName }))}
                                    filterOption={(inputValue, option) =>
                                        option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                    }
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="visitLocation" label="走访地点">
                                <Input placeholder="地址/会议室" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="intervieweeName" label="受访人姓名">
                                <Input placeholder="姓名" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="intervieweePosition" label="职务">
                                <Input placeholder="职位" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="intervieweePhone" label="联系方式">
                                <Input placeholder="电话/微信" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item 
                                name="visitDate" 
                                label="走访时间" 
                                rules={[{ required: true, message: '请选择走访时间' }]}
                            >
                                <DatePicker 
                                    style={{ width: '100%' }} 
                                    showTime 
                                    format="YYYY-MM-DD HH:mm" 
                                    placeholder="请选择走访时间"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="visitor" label="执行走访人">
                                <Input placeholder="实际走访人" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {editingTask && (
                        <>
                            <Divider>走访结果与反馈</Divider>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="status" label="任务状态">
                                        <Select>
                                            <Select.Option value="Pending">待派发</Select.Option>
                                            <Select.Option value="InProgress">进行中</Select.Option>
                                            <Select.Option value="Completed">已完成</Select.Option>
                                            <Select.Option value="Cancelled">已取消</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="content" label="走访纪要">
                                <Input.TextArea rows={4} placeholder="详细记录走访沟通内容" />
                            </Form.Item>
                            <Form.Item name="feedback" label="企业诉求/反馈">
                                <Input.TextArea rows={2} placeholder="企业提出的问题或建议" />
                            </Form.Item>
                        </>
                    )}
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
                        <Button type="primary" icon={<EditOutlined />} onClick={() => { 
                            setDetailVisible(false); 
                            setEditingTask(selectedTask); 
                            if (selectedTask) {
                                form.setFieldsValue({ 
                                    ...selectedTask, 
                                    visitDate: selectedTask.visitDate ? dayjs(selectedTask.visitDate) : dayjs() 
                                });
                            }
                            setIsModalVisible(true); 
                        }}>编辑</Button>
                    </Space>
                }
            >
                {selectedTask ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Descriptions title="基本信息" bordered column={2}>
                            <Descriptions.Item label="任务标题" span={2}>{selectedTask.title}</Descriptions.Item>
                            <Descriptions.Item label="走访类型">{selectedTask.visitType}</Descriptions.Item>
                            <Descriptions.Item label="走访方式">{selectedTask.visitMethod}</Descriptions.Item>
                            <Descriptions.Item label="企管员">{selectedTask.managerName}</Descriptions.Item>
                            <Descriptions.Item label="联系电话">{selectedTask.phone}</Descriptions.Item>
                            <Descriptions.Item label="任务状态">
                                <Tag color={statusMap[selectedTask.status]?.color} icon={statusMap[selectedTask.status]?.icon}>
                                    {statusMap[selectedTask.status]?.text}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="创建时间">{dayjs(selectedTask.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
                            <Descriptions.Item label="计划说明" span={2}>{selectedTask.details || '-'}</Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Descriptions title="受访信息" bordered column={2}>
                            <Descriptions.Item label="受访企业" span={2}>{selectedTask.tenantName || '-'}</Descriptions.Item>
                            <Descriptions.Item label="受访人">{selectedTask.intervieweeName || '-'}</Descriptions.Item>
                            <Descriptions.Item label="职务">{selectedTask.intervieweePosition || '-'}</Descriptions.Item>
                            <Descriptions.Item label="走访地点" span={2}>{selectedTask.visitLocation || '-'}</Descriptions.Item>
                            <Descriptions.Item label="走访时间">{selectedTask.visitDate ? dayjs(selectedTask.visitDate).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                            <Descriptions.Item label="执行人">{selectedTask.visitor || '-'}</Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Descriptions title="走访结果" bordered column={1}>
                            <Descriptions.Item label="走访纪要">
                                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.content || '暂无记录'}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="企业诉求/反馈">
                                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.feedback || '暂无反馈'}</Text>
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
