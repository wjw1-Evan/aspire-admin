import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, Descriptions, InputNumber, Tabs, Progress, Popconfirm, DatePicker, Flex, Drawer } from 'antd';
import { useIntl } from '@umijs/max';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserAddOutlined, ProjectOutlined, PhoneOutlined, MailOutlined, ReloadOutlined, SwapOutlined, TeamOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import PageContainer from '@/components/PageContainer';
import { DataTable } from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import StatCard from '@/components/StatCard';
import * as parkService from '@/services/park';
import type { InvestmentLead, InvestmentProject, InvestmentStatistics } from '@/services/park';
import dayjs from 'dayjs';
import styles from './index.less';

const { Text } = Typography;


const InvestmentManagement: React.FC = () => {
    const intl = useIntl();
    const leadTableRef = useRef<ActionType>(null);
    const projectTableRef = useRef<ActionType>(null);
    const { message } = App.useApp();
    const [leadForm] = Form.useForm();
    const [projectForm] = Form.useForm();
    const [searchForm] = Form.useForm();

    const [activeTab, setActiveTab] = useState<string>('leads');
    const [statistics, setStatistics] = useState<InvestmentStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [leadModalVisible, setLeadModalVisible] = useState(false);
    const [projectModalVisible, setProjectModalVisible] = useState(false);
    const [leadDetailVisible, setLeadDetailVisible] = useState(false);
    const [projectDetailVisible, setProjectDetailVisible] = useState(false);
    const [currentLead, setCurrentLead] = useState<InvestmentLead | null>(null);
    const [currentProject, setCurrentProject] = useState<InvestmentProject | null>(null);
    const [isEdit, setIsEdit] = useState(false);

    const loadStatistics = useCallback(async () => {
        try {
            const res = await parkService.getInvestmentStatistics();
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

    const priorityOptions = [
        { label: '高', value: 'High', color: 'red' },
        { label: '中', value: 'Medium', color: 'orange' },
        { label: '低', value: 'Low', color: 'green' },
    ];

    const leadStatusOptions = [
        { label: '新建', value: 'New', color: 'blue' },
        { label: '跟进中', value: 'Following', color: 'processing' },
        { label: '已报价', value: 'Quoted', color: 'orange' },
        { label: '已成交', value: 'Qualified', color: 'green' },
        { label: '已流失', value: 'Lost', color: 'default' },
    ];

    const projectStageOptions = [
        { label: '初步接洽', value: 'Initial', color: 'blue' },
        { label: '需求分析', value: 'Analysis', color: 'cyan' },
        { label: '方案制定', value: 'Proposal', color: 'orange' },
        { label: '商务谈判', value: 'Negotiation', color: 'gold' },
        { label: '合同签订', value: 'Contract', color: 'lime' },
        { label: '已完成', value: 'Completed', color: 'green' },
        { label: '已终止', value: 'Cancelled', color: 'default' },
    ];

    const leadColumns: ProColumns<InvestmentLead>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.company', defaultMessage: '意向企业' }),
            dataIndex: 'companyName',
            width: 180,
            render: (_, record) => (
                <Space onClick={() => handleViewLead(record)} style={{ cursor: 'pointer', color: '#1890ff' }}>
                    <TeamOutlined />
                    <Text strong style={{ color: 'inherit' }}>{record.companyName}</Text>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.contact', defaultMessage: '联系人' }),
            dataIndex: 'contactPerson',
            width: 120,
            render: (text, record) => (
                <Flex vertical gap={0}>
                    <Text>{text || '-'}</Text>
                    {record.phone && <Text type="secondary" style={{ fontSize: 12 }}><PhoneOutlined /> {record.phone}</Text>}
                </Flex>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.industry', defaultMessage: '行业' }),
            dataIndex: 'industry',
            width: 100,
            render: (text) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.source', defaultMessage: '来源' }),
            dataIndex: 'source',
            width: 100,
            render: (source) => {
                const sourceMap: Record<string, string> = {
                    Direct: '直接咨询',
                    Referral: '客户推荐',
                    Exhibition: '展会',
                    Website: '官网',
                    Other: '其他',
                };
                const s = source as string;
                return <Tag>{sourceMap[s] || s}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.intendedArea', defaultMessage: '意向面积' }),
            dataIndex: 'intendedArea',
            width: 100,
            align: 'right',
            render: (area) => area ? `${area} m²` : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.priority', defaultMessage: '优先级' }),
            dataIndex: 'priority',
            width: 80,
            render: (priority) => {
                const opt = priorityOptions.find(o => o.value === priority);
                return <Tag color={opt?.color || 'default'}>{opt?.label || priority}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.status', defaultMessage: '状态' }),
            dataIndex: 'status',
            width: 100,
            render: (status) => {
                const opt = leadStatusOptions.find(o => o.value === status);
                return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.lead.nextFollowUp', defaultMessage: '下次跟进' }),
            dataIndex: 'nextFollowUpDate',
            width: 110,
            render: (date) => date ? dayjs(date as string).format('YYYY-MM-DD') : '-',
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditLead(record)}>
                        {intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<SwapOutlined />}
                        onClick={() => handleConvertToProject(record.id)}
                        disabled={record.status === 'Lost' || record.status === 'Qualified'}
                    >
                        {intl.formatMessage({ id: 'pages.park.investment.convertToProject', defaultMessage: '转为项目' })}
                    </Button>
                    <Popconfirm
                        title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })}
                        onConfirm={() => handleDeleteLead(record.id)}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const projectColumns: ProColumns<InvestmentProject>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.name', defaultMessage: '项目名称' }),
            dataIndex: 'projectName',
            width: 200,
            render: (_, record) => (
                <Space onClick={() => handleViewProject(record)} style={{ cursor: 'pointer', color: '#52c41a' }}>
                    <ProjectOutlined />
                    <Text strong style={{ color: 'inherit' }}>{record.projectName}</Text>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.company', defaultMessage: '企业名称' }),
            dataIndex: 'companyName',
            width: 150,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.contact', defaultMessage: '联系人' }),
            dataIndex: 'contactPerson',
            width: 100,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.area', defaultMessage: '意向面积' }),
            dataIndex: 'intendedArea',
            width: 100,
            align: 'right',
            render: (area) => area ? `${area} m²` : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.rent', defaultMessage: '报价租金' }),
            dataIndex: 'proposedRent',
            width: 120,
            align: 'right',
            render: (rent) => rent ? `¥${rent?.toLocaleString()}/月` : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.stage', defaultMessage: '阶段' }),
            dataIndex: 'stage',
            width: 100,
            render: (stage) => {
                const opt = projectStageOptions.find(o => o.value === stage);
                return <Tag color={opt?.color || 'default'}>{opt?.label || stage}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.probability', defaultMessage: '成功率' }),
            dataIndex: 'probability',
            width: 100,
            render: (prob) => prob ? <Progress percent={prob as number} size="small" style={{ width: 80 }} /> : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.investment.project.expectedDate', defaultMessage: '预计签约' }),
            dataIndex: 'expectedSignDate',
            width: 110,
            render: (date) => date ? dayjs(date as string).format('YYYY-MM-DD') : '-',
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditProject(record)}>
                        {intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}
                    </Button>
                    <Popconfirm
                        title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })}
                        onConfirm={() => handleDeleteProject(record.id)}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const fetchLeads = async (params: any) => {
        try {
            const res = await parkService.getLeads({
                page: params.current || 1,
                pageSize: params.pageSize || 10,
                search: params.search,
                status: params.status,
                priority: params.priority,
            });
            if (res.success && res.data) {
                return { data: res.data.leads, total: res.data.total, success: true };
            }
            return { data: [], total: 0, success: false };
        } catch (error) {
            return { data: [], total: 0, success: false };
        }
    };

    const fetchProjects = async (params: any) => {
        try {
            const res = await parkService.getProjects({
                page: params.current || 1,
                pageSize: params.pageSize || 10,
                search: params.search,
                stage: params.stage,
            });
            if (res.success && res.data) {
                return { data: res.data.projects, total: res.data.total, success: true };
            }
            return { data: [], total: 0, success: false };
        } catch (error) {
            return { data: [], total: 0, success: false };
        }
    };

    const handleViewLead = (lead: InvestmentLead) => {
        setCurrentLead(lead);
        setLeadDetailVisible(true);
    };

    const handleViewProject = (project: InvestmentProject) => {
        setCurrentProject(project);
        setProjectDetailVisible(true);
    };

    const handleEditLead = (lead: InvestmentLead) => {
        setCurrentLead(lead);
        setIsEdit(true);
        leadForm.setFieldsValue({
            ...lead,
            nextFollowUpDate: lead.nextFollowUpDate ? dayjs(lead.nextFollowUpDate) : undefined,
        });
        setLeadModalVisible(true);
    };

    const handleDeleteLead = async (id: string) => {
        try {
            setLoading(true);
            const res = await parkService.deleteLead(id);
            if (res.success) {
                message.success(intl.formatMessage({ id: 'common.deleteSuccess', defaultMessage: '删除成功' }));
                leadTableRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            message.error(intl.formatMessage({ id: 'common.deleteFailed', defaultMessage: '删除失败' }));
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToProject = async (leadId: string) => {
        try {
            setLoading(true);
            const res = await parkService.convertLeadToProject(leadId);
            if (res.success) {
                message.success(intl.formatMessage({ id: 'pages.park.investment.convertSuccess', defaultMessage: '转换成功' }));
                leadTableRef.current?.reload();
                projectTableRef.current?.reload();
                loadStatistics();
                setActiveTab('projects');
            }
        } catch (error) {
            message.error(intl.formatMessage({ id: 'pages.park.investment.convertFailed', defaultMessage: '转换失败' }));
        } finally {
            setLoading(false);
        }
    };

    const handleAddLead = () => {
        setCurrentLead(null);
        setIsEdit(false);
        leadForm.resetFields();
        setLeadModalVisible(true);
    };

    const handleLeadSubmit = async () => {
        try {
            const values = await leadForm.validateFields();
            setLoading(true);

            const submitData = {
                ...values,
                nextFollowUpDate: values.nextFollowUpDate?.toISOString(),
            };

            const res = isEdit && currentLead
                ? await parkService.updateLead(currentLead.id, submitData)
                : await parkService.createLead(submitData);

            if (res.success) {
                message.success(intl.formatMessage({
                    id: isEdit ? 'common.updateSuccess' : 'common.createSuccess',
                    defaultMessage: isEdit ? '更新成功' : '创建成功'
                }));
                setLeadModalVisible(false);
                leadTableRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProject = (project: InvestmentProject) => {
        setCurrentProject(project);
        setIsEdit(true);
        projectForm.setFieldsValue({
            ...project,
            expectedSignDate: project.expectedSignDate ? dayjs(project.expectedSignDate) : undefined,
        });
        setProjectModalVisible(true);
    };

    const handleDeleteProject = async (id: string) => {
        try {
            setLoading(true);
            const res = await parkService.deleteProject(id);
            if (res.success) {
                message.success(intl.formatMessage({ id: 'common.deleteSuccess', defaultMessage: '删除成功' }));
                projectTableRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            message.error(intl.formatMessage({ id: 'common.deleteFailed', defaultMessage: '删除失败' }));
        } finally {
            setLoading(false);
        }
    };

    const handleAddProject = () => {
        setCurrentProject(null);
        setIsEdit(false);
        projectForm.resetFields();
        setProjectModalVisible(true);
    };

    const handleProjectSubmit = async () => {
        try {
            const values = await projectForm.validateFields();
            setLoading(true);

            const submitData = {
                ...values,
                expectedSignDate: values.expectedSignDate?.toISOString(),
            };

            const res = isEdit && currentProject
                ? await parkService.updateProject(currentProject.id, submitData)
                : await parkService.createProject(submitData);

            if (res.success) {
                message.success(intl.formatMessage({
                    id: isEdit ? 'common.updateSuccess' : 'common.createSuccess',
                    defaultMessage: isEdit ? '更新成功' : '创建成功'
                }));
                setProjectModalVisible(false);
                projectTableRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (activeTab === 'leads') {
            leadTableRef.current?.reload();
        } else {
            projectTableRef.current?.reload();
        }
    };

    const handleReset = () => {
        searchForm.resetFields();
        handleSearch();
    };

    const handleRefresh = () => {
        if (activeTab === 'leads') {
            leadTableRef.current?.reload();
        } else {
            projectTableRef.current?.reload();
        }
        loadStatistics();
    };

    const handleAdd = () => {
        if (activeTab === 'leads') {
            handleAddLead();
        } else {
            handleAddProject();
        }
    };

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.investment.title', defaultMessage: '招商管理' })}
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                        {intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        {activeTab === 'leads'
                            ? intl.formatMessage({ id: 'pages.park.investment.addLead', defaultMessage: '新增线索' })
                            : intl.formatMessage({ id: 'pages.park.investment.addProject', defaultMessage: '新增项目' })}
                    </Button>
                </Space>
            }
        >
            {statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.investment.stats.leads', defaultMessage: '总线索数' })}
                            value={statistics.totalLeads}
                            icon={<UserAddOutlined />}
                            color="#1890ff"
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>本月新增: {statistics.newLeadsThisMonth}</Text>}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.investment.stats.projects', defaultMessage: '项目总数' })}
                            value={statistics.totalProjects}
                            icon={<ProjectOutlined />}
                            color="#52c41a"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.investment.stats.negotiation', defaultMessage: '谈判中' })}
                            value={statistics.projectsInNegotiation}
                            icon={<SwapOutlined />}
                            color="#faad14"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.investment.stats.conversion', defaultMessage: '转化率' })}
                            value={`${statistics.conversionRate}%`}
                            icon={<TeamOutlined />}
                            color={statistics.conversionRate >= 30 ? '#52c41a' : statistics.conversionRate >= 15 ? '#faad14' : '#f5222d'}
                        />
                    </Col>
                </Row>
            )}

            <SearchFormCard>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="search">
                        <Input placeholder={intl.formatMessage({ id: 'common.search.placeholder', defaultMessage: '搜索...' })} style={{ width: 200 }} allowClear />
                    </Form.Item>
                    {activeTab === 'leads' ? (
                        <>
                            <Form.Item name="status">
                                <Select placeholder="状态" style={{ width: 120 }} allowClear options={leadStatusOptions.map(o => ({ label: o.label, value: o.value }))} />
                            </Form.Item>
                            <Form.Item name="priority">
                                <Select placeholder="优先级" style={{ width: 100 }} allowClear options={priorityOptions.map(o => ({ label: o.label, value: o.value }))} />
                            </Form.Item>
                        </>
                    ) : (
                        <Form.Item name="stage">
                            <Select placeholder="阶段" style={{ width: 120 }} allowClear options={projectStageOptions.map(o => ({ label: o.label, value: o.value }))} />
                        </Form.Item>
                    )}
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">{intl.formatMessage({ id: 'common.search', defaultMessage: '搜索' })}</Button>
                            <Button onClick={handleReset} icon={<ReloadOutlined />}>{intl.formatMessage({ id: 'common.reset', defaultMessage: '重置' })}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </SearchFormCard>

            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'leads',
                            label: (
                                <Space>
                                    <UserAddOutlined />
                                    {intl.formatMessage({ id: 'pages.park.investment.leads', defaultMessage: '招商线索' })}
                                </Space>
                            ),
                            children: (
                                <DataTable<InvestmentLead>
                                    actionRef={leadTableRef}
                                    columns={leadColumns as any}
                                    request={fetchLeads}
                                    rowKey="id"
                                    scroll={{ x: 1400 }}
                                    search={false}
                                />
                            ),
                        },
                        {
                            key: 'projects',
                            label: (
                                <Space>
                                    <ProjectOutlined />
                                    {intl.formatMessage({ id: 'pages.park.investment.projects', defaultMessage: '招商项目' })}
                                </Space>
                            ),
                            children: (
                                <DataTable<InvestmentProject>
                                    actionRef={projectTableRef}
                                    columns={projectColumns as any}
                                    request={fetchProjects}
                                    rowKey="id"
                                    scroll={{ x: 1300 }}
                                    search={false}
                                />
                            ),
                        },
                    ]}
                />
            </Card>

            {/* 线索编辑弹窗 */}
            <Modal
                title={intl.formatMessage({ id: isEdit ? 'pages.park.investment.editLead' : 'pages.park.investment.addLead', defaultMessage: isEdit ? '编辑线索' : '新增线索' })}
                open={leadModalVisible}
                onOk={handleLeadSubmit}
                onCancel={() => setLeadModalVisible(false)}
                confirmLoading={loading}
                width={640}
            >
                <Form form={leadForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="companyName" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
                                <Input placeholder="请输入企业名称" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="industry" label="行业">
                                <Input placeholder="请输入行业" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="contactPerson" label="联系人">
                                <Input placeholder="联系人姓名" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="phone" label="电话">
                                <Input placeholder="联系电话" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="email" label="邮箱">
                                <Input placeholder="邮箱地址" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="source" label="来源">
                                <Select placeholder="请选择" options={[
                                    { label: '直接咨询', value: 'Direct' },
                                    { label: '客户推荐', value: 'Referral' },
                                    { label: '展会', value: 'Exhibition' },
                                    { label: '官网', value: 'Website' },
                                    { label: '其他', value: 'Other' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="priority" label="优先级">
                                <Select placeholder="请选择" options={priorityOptions.map(o => ({ label: o.label, value: o.value }))} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="intendedArea" label="意向面积 (m²)">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="意向面积" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="budget" label="预算 (元/月)">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="预算" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="nextFollowUpDate" label="下次跟进日期">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="requirements" label="需求描述">
                        <Input.TextArea rows={3} placeholder="请输入需求描述" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 项目编辑弹窗 */}
            <Modal
                title={intl.formatMessage({ id: isEdit ? 'pages.park.investment.editProject' : 'pages.park.investment.addProject', defaultMessage: isEdit ? '编辑项目' : '新增项目' })}
                open={projectModalVisible}
                onOk={handleProjectSubmit}
                onCancel={() => setProjectModalVisible(false)}
                confirmLoading={loading}
                width={640}
            >
                <Form form={projectForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="projectName" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
                                <Input placeholder="请输入项目名称" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="companyName" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
                                <Input placeholder="请输入企业名称" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="contactPerson" label="联系人">
                                <Input placeholder="联系人姓名" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="电话">
                                <Input placeholder="联系电话" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="intendedArea" label="意向面积 (m²)">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="意向面积" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="proposedRent" label="报价租金 (元/月)">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="报价租金" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="probability" label="成功率 (%)">
                                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="成功率" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="stage" label="项目阶段">
                                <Select placeholder="请选择" options={projectStageOptions.map(o => ({ label: o.label, value: o.value }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expectedSignDate" label="预计签约日期">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="备注">
                        <Input.TextArea rows={3} placeholder="请输入备注" />
                    </Form.Item>
                </Form>
            </Modal>
            {/* 线索详情抽屉 */}
            <Drawer
                title="线索详情"
                width={600}
                open={leadDetailVisible}
                onClose={() => setLeadDetailVisible(false)}
            >
                {currentLead && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="企业名称">{currentLead.companyName}</Descriptions.Item>
                        <Descriptions.Item label="行业">{currentLead.industry || '-'}</Descriptions.Item>
                        <Descriptions.Item label="联系人">{currentLead.contactPerson || '-'}</Descriptions.Item>
                        <Descriptions.Item label="电话">{currentLead.phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label="邮箱">{currentLead.email || '-'}</Descriptions.Item>
                        <Descriptions.Item label="来源">
                            {(() => {
                                const sourceMap: Record<string, string> = {
                                    Direct: '直接咨询',
                                    Referral: '客户推荐',
                                    Exhibition: '展会',
                                    Website: '官网',
                                    Other: '其他',
                                };
                                return sourceMap[currentLead.source] || currentLead.source;
                            })()}
                        </Descriptions.Item>
                        <Descriptions.Item label="意向面积">
                            {currentLead.intendedArea ? `${currentLead.intendedArea} m²` : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="优先级">
                            {(() => {
                                const opt = priorityOptions.find(o => o.value === currentLead.priority);
                                return <Tag color={opt?.color}>{opt?.label || currentLead.priority}</Tag>;
                            })()}
                        </Descriptions.Item>
                        <Descriptions.Item label="当前状态">
                            {(() => {
                                const opt = leadStatusOptions.find(o => o.value === currentLead.status);
                                return <Tag color={opt?.color}>{opt?.label || currentLead.status}</Tag>;
                            })()}
                        </Descriptions.Item>
                        <Descriptions.Item label="下次跟进日期">
                            {currentLead.nextFollowUpDate ? dayjs(currentLead.nextFollowUpDate).format('YYYY-MM-DD') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建时间">
                            {dayjs(currentLead.createdAt).format('YYYY-MM-DD HH:mm')}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>

            {/* 项目详情抽屉 */}
            <Drawer
                title="项目详情"
                width={600}
                open={projectDetailVisible}
                onClose={() => setProjectDetailVisible(false)}
            >
                {currentProject && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="项目名称">{currentProject.projectName}</Descriptions.Item>
                        <Descriptions.Item label="企业名称">{currentProject.companyName}</Descriptions.Item>
                        <Descriptions.Item label="联系人">{currentProject.contactPerson || '-'}</Descriptions.Item>
                        <Descriptions.Item label="电话">{currentProject.phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label="意向面积">
                            {currentProject.intendedArea ? `${currentProject.intendedArea} m²` : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="报价租金">
                            {currentProject.proposedRent ? `¥${currentProject.proposedRent?.toLocaleString()}/月` : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="当前阶段">
                            {(() => {
                                const opt = projectStageOptions.find(o => o.value === currentProject.stage);
                                return <Tag color={opt?.color}>{opt?.label || currentProject.stage}</Tag>;
                            })()}
                        </Descriptions.Item>
                        <Descriptions.Item label="成功率">
                            <Progress percent={currentProject.probability as number} size="small" />
                        </Descriptions.Item>
                        <Descriptions.Item label="预计签约日期">
                            {currentProject.expectedSignDate ? dayjs(currentProject.expectedSignDate).format('YYYY-MM-DD') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建时间">
                            {dayjs(currentProject.createdAt).format('YYYY-MM-DD HH:mm')}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </PageContainer>
    );
};

export default InvestmentManagement;
