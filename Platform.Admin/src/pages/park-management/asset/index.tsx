import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Modal, Drawer, App, Space, Row, Col, Tag, Typography, Descriptions, InputNumber, Tabs, Table, Badge, Statistic, Progress, Popconfirm, Flex, Upload, DatePicker } from 'antd';
import type { UploadFile } from 'antd';
import { useIntl, useModel } from '@umijs/max';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HomeOutlined, BankOutlined, EnvironmentOutlined, AreaChartOutlined, SyncOutlined, ReloadOutlined, UploadOutlined, PaperClipOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import PageContainer from '@/components/PageContainer';
import { DataTable } from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import StatCard from '@/components/StatCard';
import * as parkService from '@/services/park';
import * as cloudService from '@/services/cloud-storage/api';
import type { Building, PropertyUnit, AssetStatistics, LeaseContract } from '@/services/park';
import dayjs from 'dayjs';
import styles from './index.less';

const { Text, Title } = Typography;


const AssetManagement: React.FC = () => {
    const intl = useIntl();
    const buildingTableRef = useRef<ActionType>(null);
    const unitTableRef = useRef<ActionType>(null);
    const { message } = App.useApp();
    const [buildingForm] = Form.useForm();
    const [unitForm] = Form.useForm();
    const [searchForm] = Form.useForm();

    const [activeTab, setActiveTab] = useState<string>('buildings');
    const [statistics, setStatistics] = useState<AssetStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [buildingModalVisible, setBuildingModalVisible] = useState(false);
    const [unitModalVisible, setUnitModalVisible] = useState(false);
    const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
    const [unitDetailDrawerVisible, setUnitDetailDrawerVisible] = useState(false);
    const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
    const [currentUnit, setCurrentUnit] = useState<PropertyUnit | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [isEdit, setIsEdit] = useState(false);

    // Upload State
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [attachmentList, setAttachmentList] = useState<UploadFile[]>([]);

    // 加载统计数据
    const loadStatistics = useCallback(async () => {
        try {
            const res = await parkService.getAssetStatistics();
            if (res.success && res.data) {
                setStatistics(res.data);
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }, []);

    // 加载楼宇列表（用于下拉选择）
    const loadBuildings = useCallback(async () => {
        try {
            const res = await parkService.getBuildings({ page: 1, pageSize: 100 });
            if (res.success && res.data?.buildings) {
                setBuildings(res.data.buildings);
            }
        } catch (error) {
            console.error('Failed to load buildings:', error);
        }
    }, []);

    useEffect(() => {
        loadStatistics();
        loadBuildings();
    }, [loadStatistics, loadBuildings]);

    // 楼宇表格列
    const buildingColumns: ProColumns<Building>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.name', defaultMessage: '楼宇名称' }),
            dataIndex: 'name',
            width: 160,
            render: (_, record) => (
                <Space>
                    <BankOutlined style={{ color: '#1890ff' }} />
                    <a onClick={() => handleViewBuilding(record)}>{record.name}</a>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.address', defaultMessage: '地址' }),
            dataIndex: 'address',
            width: 200,
            ellipsis: true,
            render: (_, record) => record.address || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.type', defaultMessage: '类型' }),
            dataIndex: 'buildingType',
            width: 100,
            render: (_, record) => (
                <Tag color={record.buildingType === 'Office' ? 'blue' : record.buildingType === 'Commercial' ? 'green' : 'orange'}>
                    {record.buildingType === 'Office' ? '办公楼' : record.buildingType === 'Commercial' ? '商业楼' : record.buildingType || '综合'}
                </Tag>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.floors', defaultMessage: '楼层' }),
            dataIndex: 'totalFloors',
            width: 80,
            align: 'center',
            render: (_, record) => `${record.totalFloors}层`,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.area', defaultMessage: '总面积' }),
            dataIndex: 'totalArea',
            width: 120,
            align: 'right',
            render: (_, record) => `${record.totalArea?.toLocaleString()} m²`,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.occupancy', defaultMessage: '出租率' }),
            dataIndex: 'occupancyRate',
            width: 120,
            render: (_, record) => (
                <Progress
                    percent={record.occupancyRate || 0}
                    size="small"
                    status={(record.occupancyRate || 0) >= 80 ? 'success' : (record.occupancyRate || 0) >= 50 ? 'normal' : 'exception'}
                    strokeColor={(record.occupancyRate || 0) >= 80 ? '#52c41a' : (record.occupancyRate || 0) >= 50 ? '#1890ff' : '#faad14'}
                />
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.units', defaultMessage: '房源数量' }),
            dataIndex: 'totalUnits',
            width: 140,
            align: 'center',
            render: (totalUnits, record) => (
                <Flex vertical align="center" gap={0}>
                    <Button
                        type="link"
                        size="small"
                        style={{ fontWeight: 'bold', fontSize: 16 }}
                        onClick={() => {
                            setActiveTab('units');
                            searchForm.setFieldsValue({ buildingId: record.id });
                            // Timeout to ensure tab switch and state update
                            setTimeout(() => {
                                unitTableRef.current?.reload();
                            }, 0);
                        }}
                    >
                        {totalUnits}
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12 }}>可用: {record.availableUnits}</Text>
                </Flex>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.building.status', defaultMessage: '状态' }),
            dataIndex: 'status',
            width: 100,
            render: (_, record) => (
                <Tag color={record.status === 'Active' ? 'green' : record.status === 'Maintenance' ? 'orange' : 'default'}>
                    {record.status === 'Active' ? '正常' : record.status === 'Maintenance' ? '维护中' : record.status}
                </Tag>
            ),
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewBuilding(record)}>
                        {intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}
                    </Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditBuilding(record)}>
                        {intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}
                    </Button>
                    <Popconfirm
                        title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })}
                        onConfirm={() => handleDeleteBuilding(record.id)}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // 房源表格列
    const unitColumns: ProColumns<PropertyUnit>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.asset.unit.number', defaultMessage: '房源编号' }),
            dataIndex: 'unitNumber',
            width: 120,
            render: (_, record) => (
                <Space>
                    <HomeOutlined style={{ color: '#52c41a' }} />
                    <a onClick={() => handleViewUnit(record)}>{record.unitNumber}</a>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.unit.building', defaultMessage: '所属楼宇' }),
            dataIndex: 'buildingName',
            width: 150,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.unit.floor', defaultMessage: '楼层' }),
            dataIndex: 'floor',
            width: 80,
            align: 'center',
            render: (_, record) => `${record.floor}F`,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.unit.area', defaultMessage: '面积' }),
            dataIndex: 'area',
            width: 100,
            align: 'right',
            render: (_, record) => `${record.area} m²`,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.unit.rent', defaultMessage: '月租金' }),
            dataIndex: 'monthlyRent',
            width: 120,
            align: 'right',
            render: (_, record) => `¥${record.monthlyRent?.toLocaleString()}`,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.unit.type', defaultMessage: '类型' }),
            dataIndex: 'unitType',
            width: 100,
            render: (_, record) => (
                <Tag color={record.unitType === 'Office' ? 'blue' : record.unitType === 'Commercial' ? 'green' : 'purple'}>
                    {record.unitType === 'Office' ? '办公' : record.unitType === 'Commercial' ? '商铺' : record.unitType || '其他'}
                </Tag>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.asset.unit.status', defaultMessage: '状态' }),
            dataIndex: 'status',
            width: 100,
            render: (_, record) => {
                const statusMap: Record<string, { color: string; text: string }> = {
                    Available: { color: 'green', text: '空置' },
                    Rented: { color: 'blue', text: '已出租' },
                    Reserved: { color: 'orange', text: '预留' },
                    Maintenance: { color: 'red', text: '维护' },
                };
                const config = statusMap[record.status] || { color: 'default', text: record.status };
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewUnit(record)}>
                        {intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}
                    </Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditUnit(record)}>
                        {intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}
                    </Button>

                    <Popconfirm
                        title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })}
                        onConfirm={() => handleDeleteUnit(record.id)}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // 楼宇请求
    const fetchBuildings = async (params: any) => {
        try {
            const formValues = searchForm.getFieldsValue();
            const res = await parkService.getBuildings({
                page: params.current || 1,
                pageSize: params.pageSize || 10,
                ...formValues,
            });
            if (res.success && res.data) {
                return { data: res.data.buildings, total: res.data.total, success: true };
            }
            return { data: [], total: 0, success: false };
        } catch (error) {
            return { data: [], total: 0, success: false };
        }
    };

    // 房源请求
    const fetchUnits = async (params: any) => {
        try {
            const formValues = searchForm.getFieldsValue();
            const res = await parkService.getPropertyUnits({
                page: params.current || 1,
                pageSize: params.pageSize || 10,
                ...formValues,
            });
            if (res.success && res.data) {
                return { data: res.data.units, total: res.data.total, success: true };
            }
            return { data: [], total: 0, success: false };
        } catch (error) {
            return { data: [], total: 0, success: false };
        }
    };

    // 事件处理
    const handleViewBuilding = (building: Building) => {
        setCurrentBuilding(building);
        setDetailDrawerVisible(true);
    };

    const handleViewUnit = async (unit: PropertyUnit) => {
        setLoading(true);
        try {
            const res = await parkService.getPropertyUnit(unit.id);
            if (res.success && res.data) {
                setCurrentUnit(res.data);
                setUnitDetailDrawerVisible(true);
            }
        } catch (error) {
            message.error('获取房源详情失败');
        } finally {
            setLoading(false);
        }
    };

    const handleEditBuilding = (building: Building) => {
        setCurrentBuilding(building);
        setIsEdit(true);
        buildingForm.setFieldsValue({
            ...building,
            deliveryDate: building.deliveryDate ? dayjs(building.deliveryDate) : undefined,
        });
        setAttachmentList((building.attachments || []).map((url, index) => {
            const fileName = url.split('/').pop() || 'file';
            const decodedName = decodeURIComponent(fileName);
            return {
                uid: `-${index}`,
                name: decodedName,
                status: 'done',
                url: url,
            };
        }));
        setBuildingModalVisible(true);
    };

    const handleDeleteBuilding = async (id: string) => {
        try {
            setLoading(true);
            const res = await parkService.deleteBuilding(id);
            if (res.success) {
                message.success(intl.formatMessage({ id: 'common.deleteSuccess', defaultMessage: '删除成功' }));
                buildingTableRef.current?.reload();
                loadStatistics();
                loadBuildings();
            }
        } catch (error) {
            message.error(intl.formatMessage({ id: 'common.deleteFailed', defaultMessage: '删除失败' }));
        } finally {
            setLoading(false);
        }
    };

    const handleAddBuilding = () => {
        setCurrentBuilding(null);
        setIsEdit(false);
        buildingForm.resetFields();
        setAttachmentList([]);
        setBuildingModalVisible(true);
    };

    const handleBuildingSubmit = async () => {
        try {
            const values = await buildingForm.validateFields();
            setLoading(true);

            // Process attachments
            const attachmentUrls = attachmentList.map(item => {
                if (item.response && item.response.data && item.response.data.path) {
                    return item.response.data.path;
                }
                return item.url;
            }).filter(url => url) as string[];

            const submitValues = {
                ...values,
                deliveryDate: values.deliveryDate ? values.deliveryDate.toISOString() : undefined,
                attachments: attachmentUrls
            };

            const res = isEdit && currentBuilding
                ? await parkService.updateBuilding(currentBuilding.id, submitValues)
                : await parkService.createBuilding(submitValues);

            if (res.success) {
                message.success(intl.formatMessage({
                    id: isEdit ? 'common.updateSuccess' : 'common.createSuccess',
                    defaultMessage: isEdit ? '更新成功' : '创建成功'
                }));
                setBuildingModalVisible(false);
                buildingTableRef.current?.reload();
                loadStatistics();
                loadBuildings();
            }
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUnit = (unit: PropertyUnit) => {
        setCurrentUnit(unit);
        setIsEdit(true);
        unitForm.setFieldsValue(unit);
        // Load attachments
        setAttachmentList((unit.attachments || []).map((url, index) => {
            const fileName = url.split('/').pop() || 'file';
            const decodedName = decodeURIComponent(fileName);
            return {
                uid: `-${index}`,
                name: decodedName,
                status: 'done',
                url: url,
            };
        }));
        setUnitModalVisible(true);
    };

    const handleDeleteUnit = async (id: string) => {
        try {
            setLoading(true);
            const res = await parkService.deletePropertyUnit(id);
            if (res.success) {
                message.success(intl.formatMessage({ id: 'common.deleteSuccess', defaultMessage: '删除成功' }));
                unitTableRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            message.error(intl.formatMessage({ id: 'common.deleteFailed', defaultMessage: '删除失败' }));
        } finally {
            setLoading(false);
        }
    };

    const handleAddUnit = () => {
        setCurrentUnit(null);
        setIsEdit(false);
        unitForm.resetFields();
        setAttachmentList([]);
        setUnitModalVisible(true);
    };

    const handleUnitSubmit = async () => {
        try {
            const values = await unitForm.validateFields();
            setLoading(true);

            // Process attachments
            const attachmentUrls = attachmentList.map(item => {
                if (item.response && item.response.data && item.response.data.path) {
                    return item.response.data.path;
                }
                return item.url;
            }).filter(url => url) as string[];

            const submitValues = { ...values, attachments: attachmentUrls };

            const res = isEdit && currentUnit
                ? await parkService.updatePropertyUnit(currentUnit.id, submitValues)
                : await parkService.createPropertyUnit(submitValues);

            if (res.success) {
                message.success(intl.formatMessage({
                    id: isEdit ? 'common.updateSuccess' : 'common.createSuccess',
                    defaultMessage: isEdit ? '更新成功' : '创建成功'
                }));
                setUnitModalVisible(false);
                unitTableRef.current?.reload();
                loadStatistics();
            }
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (activeTab === 'buildings') {
            buildingTableRef.current?.reload();
        } else {
            unitTableRef.current?.reload();
        }
    };

    const handleReset = () => {
        searchForm.resetFields();
        handleSearch();
    };

    const handleRefresh = () => {
        if (activeTab === 'buildings') {
            buildingTableRef.current?.reload();
        } else {
            unitTableRef.current?.reload();
        }
        loadStatistics();
    };

    const handleAdd = () => {
        if (activeTab === 'buildings') {
            handleAddBuilding();
        } else {
            handleAddUnit();
        }
    };

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.asset.title', defaultMessage: '资产管理' })}
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                        {intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        {activeTab === 'buildings'
                            ? intl.formatMessage({ id: 'pages.park.asset.addBuilding', defaultMessage: '新增楼宇' })
                            : intl.formatMessage({ id: 'pages.park.asset.addUnit', defaultMessage: '新增房源' })}
                    </Button>
                </Space>
            }
        >
            {/* 统计卡片 */}
            {statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.asset.stats.properties', defaultMessage: '物业总数' })}
                            value={statistics.totalBuildings}
                            icon={<BankOutlined />}
                            color="#1890ff"
                            suffix={statistics.totalBuildingsMoM !== undefined && (
                                <div style={{ fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, color: statistics.totalBuildingsMoM >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                    {statistics.totalBuildingsMoM >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                    <span>{Math.abs(statistics.totalBuildingsMoM).toFixed(1)}%</span>
                                </div>
                            )}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.asset.stats.units', defaultMessage: '房源总数' })}
                            value={statistics.totalUnits}
                            icon={<HomeOutlined />}
                            color="#52c41a"
                            suffix={
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    可用: {statistics.availableUnits}
                                </Text>
                            }
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.asset.stats.area', defaultMessage: '总面积 (m²)' })}
                            value={statistics.totalArea?.toLocaleString()}
                            icon={<AreaChartOutlined />}
                            color="#722ed1"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title={intl.formatMessage({ id: 'pages.park.asset.stats.occupancy', defaultMessage: '出租率' })}
                            value={`${statistics.occupancyRate}%`}
                            icon={<SyncOutlined />}
                            color={statistics.occupancyRate >= 80 ? '#52c41a' : statistics.occupancyRate >= 50 ? '#faad14' : '#f5222d'}
                        />
                    </Col>
                </Row>
            )}

            {/* 搜索表单 */}
            <SearchFormCard>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="search">
                        <Input
                            placeholder={intl.formatMessage({ id: 'common.search.placeholder', defaultMessage: '搜索...' })}
                            style={{ width: 200 }}
                            allowClear
                        />
                    </Form.Item>
                    <Form.Item name="status">
                        <Select
                            placeholder={intl.formatMessage({ id: 'common.status', defaultMessage: '状态' })}
                            style={{ width: 120 }}
                            allowClear
                            options={[
                                { label: '正常', value: 'Active' },
                                { label: '维护中', value: 'Maintenance' },
                                { label: '停用', value: 'Inactive' },
                            ]}
                        />
                    </Form.Item>
                    {activeTab === 'units' && (
                        <Form.Item name="buildingId">
                            <Select
                                placeholder="所属楼宇"
                                style={{ width: 160 }}
                                allowClear
                                options={buildings.map(b => ({ label: b.name, value: b.id }))}
                                onChange={() => unitTableRef.current?.reload()}
                            />
                        </Form.Item>
                    )}
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {intl.formatMessage({ id: 'common.search', defaultMessage: '搜索' })}
                            </Button>
                            <Button onClick={handleReset} icon={<ReloadOutlined />}>
                                {intl.formatMessage({ id: 'common.reset', defaultMessage: '重置' })}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </SearchFormCard>

            {/* 数据表格 */}
            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'buildings',
                            label: (
                                <Space>
                                    <BankOutlined />
                                    {intl.formatMessage({ id: 'pages.park.asset.buildings', defaultMessage: '楼宇管理' })}
                                </Space>
                            ),
                            children: (
                                <DataTable<Building>
                                    actionRef={buildingTableRef}
                                    columns={buildingColumns as any}
                                    request={fetchBuildings}
                                    rowKey="id"
                                    scroll={{ x: 1300 }}
                                    search={false}
                                />
                            ),
                        },
                        {
                            key: 'units',
                            label: (
                                <Space>
                                    <HomeOutlined />
                                    {intl.formatMessage({ id: 'pages.park.asset.units', defaultMessage: '房源管理' })}
                                </Space>
                            ),
                            children: (
                                <DataTable<PropertyUnit>
                                    actionRef={unitTableRef}
                                    columns={unitColumns as any}
                                    request={fetchUnits}
                                    rowKey="id"
                                    scroll={{ x: 1100 }}
                                    search={false}
                                />
                            ),
                        },
                    ]}
                />
            </Card>

            {/* 楼宇编辑弹窗 */}
            <Modal
                title={intl.formatMessage({
                    id: isEdit ? 'pages.park.asset.editBuilding' : 'pages.park.asset.addBuilding',
                    defaultMessage: isEdit ? '编辑楼宇' : '新增楼宇'
                })}
                open={buildingModalVisible}
                onOk={handleBuildingSubmit}
                onCancel={() => setBuildingModalVisible(false)}
                confirmLoading={loading}
                width={640}
            >
                <Form form={buildingForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label={intl.formatMessage({ id: 'pages.park.asset.building.name', defaultMessage: '楼宇名称' })}
                                rules={[{ required: true, message: '请输入楼宇名称' }]}
                            >
                                <Input placeholder="请输入楼宇名称" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="buildingType"
                                label={intl.formatMessage({ id: 'pages.park.asset.building.type', defaultMessage: '楼宇类型' })}
                            >
                                <Select
                                    placeholder="请选择类型"
                                    options={[
                                        { label: '办公楼', value: 'Office' },
                                        { label: '商业楼', value: 'Commercial' },
                                        { label: '综合楼', value: 'Mixed' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="address"
                        label={intl.formatMessage({ id: 'pages.park.asset.building.address', defaultMessage: '地址' })}
                    >
                        <Input placeholder="请输入楼宇地址" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="totalFloors"
                                label={intl.formatMessage({ id: 'pages.park.asset.building.floors', defaultMessage: '总楼层' })}
                                rules={[{ required: true, message: '请输入楼层数' }]}
                            >
                                <InputNumber min={1} max={200} style={{ width: '100%' }} placeholder="楼层数" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="totalArea"
                                label={intl.formatMessage({ id: 'pages.park.asset.building.totalArea', defaultMessage: '总面积 (m²)' })}
                                rules={[{ required: true, message: '请输入面积' }]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="总面积" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="yearBuilt"
                                label={intl.formatMessage({ id: 'pages.park.asset.building.year', defaultMessage: '建成年份' })}
                            >
                                <InputNumber min={1900} max={2100} style={{ width: '100%' }} placeholder="建成年份" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="deliveryDate"
                                label={intl.formatMessage({ id: 'pages.park.asset.building.deliveryDate', defaultMessage: '交付/取得日期' })}
                                rules={[{ required: true, message: '请选择日期' }]}
                            >
                                <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="status"
                                label={intl.formatMessage({ id: 'common.status', defaultMessage: '状态' })}
                            >
                                <Select
                                    placeholder="请选择状态"
                                    options={[
                                        { label: '正常', value: 'Active' },
                                        { label: '维护中', value: 'Maintenance' },
                                        { label: '停用', value: 'Inactive' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="description"
                        label={intl.formatMessage({ id: 'common.description', defaultMessage: '描述' })}
                    >
                        <Input.TextArea rows={3} placeholder="请输入描述信息" />
                    </Form.Item>

                    <Form.Item
                        label={intl.formatMessage({ id: 'pages.park.asset.building.uploadTitle', defaultMessage: '楼宇附件' })}
                    >
                        <Upload
                            action="/api/cloud-storage/upload"
                            listType="picture"
                            fileList={attachmentList}
                            onChange={({ fileList }) => setAttachmentList(fileList)}
                            headers={{
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                            }}
                            data={(file) => ({
                                file: file,
                                isPublic: false,
                                description: 'Building Attachment'
                            })}
                        >
                            <Button icon={<UploadOutlined />}>
                                {intl.formatMessage({ id: 'common.upload', defaultMessage: '上传附件' })}
                            </Button>
                        </Upload>
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.asset.building.uploadDesc', defaultMessage: '楼宇附件（如外观图、平面图等），支持图片和文档格式' })}
                            </Text>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 房源编辑弹窗 */}
            <Modal
                title={intl.formatMessage({
                    id: isEdit ? 'pages.park.asset.editUnit' : 'pages.park.asset.addUnit',
                    defaultMessage: isEdit ? '编辑房源' : '新增房源'
                })}
                open={unitModalVisible}
                onOk={handleUnitSubmit}
                onCancel={() => setUnitModalVisible(false)}
                confirmLoading={loading}
                width={640}
            >
                <Form form={unitForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="buildingId"
                                label={intl.formatMessage({ id: 'pages.park.asset.unit.building', defaultMessage: '所属楼宇' })}
                                rules={[{ required: true, message: '请选择楼宇' }]}
                            >
                                <Select
                                    placeholder="请选择楼宇"
                                    options={buildings.map(b => ({ label: b.name, value: b.id }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="unitNumber"
                                label={intl.formatMessage({ id: 'pages.park.asset.unit.number', defaultMessage: '房源编号' })}
                                rules={[{ required: true, message: '请输入房源编号' }]}
                            >
                                <Input placeholder="例如：A-101" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="floor"
                                label={intl.formatMessage({ id: 'pages.park.asset.unit.floor', defaultMessage: '楼层' })}
                                rules={[{ required: true, message: '请输入楼层' }]}
                            >
                                <InputNumber min={-10} max={200} style={{ width: '100%' }} placeholder="楼层" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="area"
                                label={intl.formatMessage({ id: 'pages.park.asset.unit.area', defaultMessage: '面积 (m²)' })}
                                rules={[{ required: true, message: '请输入面积' }]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="面积" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="unitType"
                                label={intl.formatMessage({ id: 'pages.park.asset.unit.type', defaultMessage: '类型' })}
                            >
                                <Select
                                    placeholder="请选择类型"
                                    options={[
                                        { label: '办公', value: 'Office' },
                                        { label: '商铺', value: 'Commercial' },
                                        { label: '仓储', value: 'Warehouse' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="monthlyRent"
                                label={intl.formatMessage({ id: 'pages.park.asset.unit.rent', defaultMessage: '月租金 (元)' })}
                                rules={[{ required: true, message: '请输入月租金' }]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="月租金" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="dailyRent"
                                label={intl.formatMessage({ id: 'pages.park.asset.unit.dailyRent', defaultMessage: '日租金 (元/m²)' })}
                            >
                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="日租金" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="description"
                        label={intl.formatMessage({ id: 'common.description', defaultMessage: '描述' })}
                    >
                        <Input.TextArea rows={3} placeholder="请输入描述信息" />
                    </Form.Item>

                    <Form.Item
                        label={intl.formatMessage({ id: 'pages.park.asset.uploadTitle', defaultMessage: '房源附件' })}
                    >
                        <Upload
                            action="/api/cloud-storage/upload"
                            listType="picture"
                            fileList={attachmentList}
                            onChange={({ fileList }) => setAttachmentList(fileList)}
                            headers={{
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                            }}
                            data={(file) => ({
                                file: file,
                                isPublic: false,
                                description: 'Property Unit Attachment'
                            })}
                        >
                            <Button icon={<UploadOutlined />}>
                                {intl.formatMessage({ id: 'common.upload', defaultMessage: '上传附件' })}
                            </Button>
                        </Upload>
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.asset.uploadDesc', defaultMessage: '房源附件（如平面图、实景图等），支持图片和文档格式' })}
                            </Text>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 楼宇详情抽屉 */}
            <Drawer
                title={currentBuilding?.name || intl.formatMessage({ id: 'pages.park.asset.buildingDetail', defaultMessage: '楼宇详情' })}
                open={detailDrawerVisible}
                onClose={() => setDetailDrawerVisible(false)}
                size={640}
            >
                {currentBuilding && (
                    <div>
                        <Descriptions
                            bordered
                            column={2}
                            size="small"
                            style={{ marginBottom: 24 }}
                        >
                            <Descriptions.Item label="楼宇名称">{currentBuilding.name}</Descriptions.Item>
                            <Descriptions.Item label="楼宇类型">
                                <Tag color="blue">{currentBuilding.buildingType || '综合'}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="地址" span={2}>{currentBuilding.address || '-'}</Descriptions.Item>
                            <Descriptions.Item label="总楼层">{currentBuilding.totalFloors}层</Descriptions.Item>
                            <Descriptions.Item label="建成年份">{currentBuilding.yearBuilt || '-'}</Descriptions.Item>
                            <Descriptions.Item label="交付/取得日期">{currentBuilding.deliveryDate ? dayjs(currentBuilding.deliveryDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                            <Descriptions.Item label="总面积">{currentBuilding.totalArea?.toLocaleString()} m²</Descriptions.Item>
                            <Descriptions.Item label="已租面积">{currentBuilding.rentedArea?.toLocaleString()} m²</Descriptions.Item>
                            <Descriptions.Item label="出租率">
                                <Progress percent={currentBuilding.occupancyRate} size="small" style={{ width: 100 }} />
                            </Descriptions.Item>
                            <Descriptions.Item label="房源总数">{currentBuilding.totalUnits}</Descriptions.Item>
                            <Descriptions.Item label="可用房源">{currentBuilding.availableUnits}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={currentBuilding.status === 'Active' ? 'green' : 'orange'}>
                                    {currentBuilding.status === 'Active' ? '正常' : '维护中'}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                        {currentBuilding.description && (
                            <div>
                                <Title level={5}>描述</Title>
                                <Text>{currentBuilding.description}</Text>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>

            {/* 房源详情抽屉 */}
            <Drawer
                title={currentUnit?.unitNumber || intl.formatMessage({ id: 'pages.park.asset.unitDetail', defaultMessage: '房源详情' })}
                open={unitDetailDrawerVisible}
                onClose={() => setUnitDetailDrawerVisible(false)}
                size={720}
            >
                {currentUnit && (
                    <Flex vertical gap={24}>
                        <div>
                            <Title level={5} style={{ marginBottom: 16 }}>基本信息</Title>
                            <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="房源编号">{currentUnit.unitNumber}</Descriptions.Item>
                                <Descriptions.Item label="所属楼宇">{currentUnit.buildingName}</Descriptions.Item>
                                <Descriptions.Item label="所在楼层">{currentUnit.floor}F</Descriptions.Item>
                                <Descriptions.Item label="房源面积">{currentUnit.area} m²</Descriptions.Item>
                                <Descriptions.Item label="房源类型">{currentUnit.unitType === 'Office' ? '办公' : currentUnit.unitType === 'Commercial' ? '商铺' : currentUnit.unitType || '其他'}</Descriptions.Item>
                                <Descriptions.Item label="月租金">¥{currentUnit.monthlyRent?.toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="状态">
                                    <Tag color={currentUnit.status === 'Available' ? 'green' : 'blue'}>
                                        {currentUnit.status === 'Available' ? '空置' : '已出租'}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="当前租客">{currentUnit.currentTenantName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="租期到期" span={2}>{currentUnit.leaseEndDate ? dayjs(currentUnit.leaseEndDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                            </Descriptions>
                            {currentUnit.description && (
                                <div style={{ marginTop: 16 }}>
                                    <Text type="secondary">描述信息：</Text>
                                    <Text>{currentUnit.description}</Text>
                                </div>
                            )}
                        </div>

                        <div>
                            <Title level={5} style={{ marginBottom: 16 }}>出租历史 ({currentUnit.leaseHistory?.length || 0})</Title>
                            <Table<LeaseContract>
                                dataSource={currentUnit.leaseHistory || []}
                                rowKey="id"
                                size="small"
                                pagination={false}
                                columns={[
                                    {
                                        title: '租户名称',
                                        dataIndex: 'tenantName',
                                        key: 'tenantName',
                                    },
                                    {
                                        title: '合同编号',
                                        dataIndex: 'contractNumber',
                                        key: 'contractNumber',
                                    },
                                    {
                                        title: '租期',
                                        key: 'period',
                                        render: (_, record) => (
                                            <span style={{ fontSize: 12 }}>
                                                {dayjs(record.startDate).format('YYYY-MM-DD')} ~ {dayjs(record.endDate).format('YYYY-MM-DD')}
                                            </span>
                                        ),
                                    },
                                    {
                                        title: '月租金',
                                        dataIndex: 'monthlyRent',
                                        key: 'monthlyRent',
                                        render: (val) => `¥${val?.toLocaleString()}`,
                                    },
                                    {
                                        title: intl.formatMessage({ id: 'pages.park.contract.status', defaultMessage: '状态' }),
                                        dataIndex: 'status',
                                        key: 'status',
                                        render: (status) => {
                                            const statusColors: Record<string, string> = {
                                                'Active': 'green',
                                                'Expired': 'default',
                                                'Renewed': 'cyan',
                                                'Terminated': 'red'
                                            };
                                            return (
                                                <Tag color={statusColors[status] || 'blue'}>
                                                    {intl.formatMessage({
                                                        id: `pages.park.contract.status.${status.toLowerCase()}`,
                                                        defaultMessage: status
                                                    })}
                                                </Tag>
                                            );
                                        }
                                    }
                                ]}
                            />
                        </div>
                    </Flex>
                )}
            </Drawer>


        </PageContainer>
    );
};

export default AssetManagement;
