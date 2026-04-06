import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { StatCard } from '@/components';
import { useIntl, request } from '@umijs/max';
import { Tag, Space, Row, Col, Button, Input, Popconfirm, Drawer, Typography, Upload, DatePicker } from 'antd';
import type { UploadFile } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDatePicker } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HomeOutlined, BankOutlined, AreaChartOutlined, SyncOutlined, ReloadOutlined, UploadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface Building {
    id: string; name: string; address?: string; totalFloors: number; totalArea: number;
    rentedArea: number; occupancyRate: number; buildingType?: string; yearBuilt?: number;
    deliveryDate?: string; status: string; description?: string; coverImage?: string;
    totalUnits: number; availableUnits: number; createdAt: string; attachments?: string[];
}

interface PropertyUnit {
    id: string; buildingId: string; buildingName?: string; unitNumber: string; floor: number;
    area: number; monthlyRent: number; dailyRent?: number; unitType: string; description?: string;
    status: string; currentTenantId?: string; currentTenantName?: string; leaseEndDate?: string;
    facilities?: string[]; images?: string[]; attachments?: string[]; leaseHistory?: LeaseContract[];
}

interface LeaseContract {
    id: string; tenantName: string; contractNumber: string; startDate: string;
    endDate: string; monthlyRent: number; status: string;
}

interface AssetStatistics {
    totalBuildings: number; totalArea: number; totalUnits: number; availableUnits: number;
    rentedUnits: number; occupancyRate: number; totalRentableArea: number; rentedArea: number;
    occupancyRateYoY?: number; occupancyRateMoM?: number; totalBuildingsYoY?: number; totalBuildingsMoM?: number;
}

const api = {
    statistics: (startDate?: string, endDate?: string) =>
        request<ApiResponse<AssetStatistics>>('/api/park/asset/statistics', { method: 'GET', params: { startDate, endDate } }),
    buildings: (params: PageParams) =>
        request<ApiResponse<PagedResult<Building>>>('/api/park/buildings/list', { method: 'POST', data: params }),
    createBuilding: (data: Partial<Building>) =>
        request<ApiResponse<Building>>('/api/park/buildings', { method: 'POST', data }),
    updateBuilding: (id: string, data: Partial<Building>) =>
        request<ApiResponse<Building>>(`/api/park/buildings/${id}`, { method: 'PUT', data }),
    deleteBuilding: (id: string) =>
        request<ApiResponse<boolean>>(`/api/park/buildings/${id}`, { method: 'DELETE' }),
    allBuildings: () =>
        request<ApiResponse<PagedResult<Building>>>('/api/park/buildings/list', { method: 'POST', data: { page: 1 } }),
    units: (params: PageParams & { buildingId?: string }) =>
        request<ApiResponse<PagedResult<PropertyUnit>>>('/api/park/properties/list', { method: 'POST', data: params }),
    unit: (id: string) =>
        request<ApiResponse<PropertyUnit>>(`/api/park/properties/${id}`, { method: 'GET' }),
    createUnit: (data: Partial<PropertyUnit>) =>
        request<ApiResponse<PropertyUnit>>('/api/park/properties', { method: 'POST', data }),
    updateUnit: (id: string, data: Partial<PropertyUnit>) =>
        request<ApiResponse<PropertyUnit>>(`/api/park/properties/${id}`, { method: 'PUT', data }),
    deleteUnit: (id: string) =>
        request<ApiResponse<boolean>>(`/api/park/properties/${id}`, { method: 'DELETE' }),
};

const AssetManagement: React.FC = () => {
    const intl = useIntl();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const buildingActionRef = useRef<ActionType | undefined>(undefined);
    const unitActionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as AssetStatistics | null,
        activeTab: 'buildings',
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
        searchText: '',
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const [buildingState, setBuildingState] = useState({
        modalVisible: false, detailVisible: false,
        editingBuilding: null as Building | null, currentBuilding: null as Building | null,
    });
    const setBuilding = (partial: Partial<typeof buildingState>) => setBuildingState(prev => ({ ...prev, ...partial }));

    const [unitState, setUnitState] = useState({
        modalVisible: false, detailVisible: false,
        editingUnit: null as PropertyUnit | null, currentUnit: null as PropertyUnit | null,
    });
    const setUnit = (partial: Partial<typeof unitState>) => setUnitState(prev => ({ ...prev, ...partial }));

    const [formState, setFormState] = useState({
        buildings: [] as Building[], attachments: [] as UploadFile[],
    });
    const setForm = (partial: Partial<typeof formState>) => setFormState(prev => ({ ...prev, ...partial }));

    useEffect(() => {
        api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        api.allBuildings().then(r => { if (r.success && r.data) setForm({ buildings: r.data.queryable || [] }); });
    }, []);

    const buildingColumns: ProColumns<Building>[] = [
        { title: intl.formatMessage({ id: 'pages.park.asset.building.name', defaultMessage: '楼宇名称' }), dataIndex: 'name', sorter: true, width: 160, render: (_, record) => (<Space><BankOutlined style={{ color: '#1890ff' }} /><a onClick={() => { setBuilding({ currentBuilding: record, detailVisible: true }); }}>{record.name}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.address', defaultMessage: '地址' }), dataIndex: 'address', sorter: true, width: 200, ellipsis: true, render: (_, record) => record.address || '-' },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.type', defaultMessage: '类型' }), dataIndex: 'buildingType', sorter: true, width: 100, render: (_, record) => (<Tag color={record.buildingType === 'Office' ? 'blue' : record.buildingType === 'Commercial' ? 'green' : 'orange'}>{record.buildingType === 'Office' ? '办公楼' : record.buildingType === 'Commercial' ? '商业楼' : record.buildingType || '综合'}</Tag>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.floors', defaultMessage: '楼层' }), dataIndex: 'totalFloors', sorter: true, width: 80, align: 'center', render: (_, record) => `${record.totalFloors}层` },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.area', defaultMessage: '总面积' }), dataIndex: 'totalArea', sorter: true, width: 120, align: 'right', render: (_, record) => `${record.totalArea?.toLocaleString()} m²` },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.occupancy', defaultMessage: '出租率' }), dataIndex: 'occupancyRate', sorter: true, width: 120, render: (_, record) => (<Tag color={(record.occupancyRate || 0) >= 80 ? 'success' : (record.occupancyRate || 0) >= 50 ? 'processing' : 'exception'}>{record.occupancyRate || 0}%</Tag>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.units', defaultMessage: '房源数量' }), dataIndex: 'totalUnits', sorter: true, width: 140, align: 'center', render: (totalUnits, record) => (<Space vertical align="center"><Button type="link" size="small" style={{ fontWeight: 'bold', fontSize: 16, padding: 0 }} onClick={() => { set({ activeTab: 'units' }); unitActionRef.current?.reload(); }}>{totalUnits}</Button><Text type="secondary" style={{ fontSize: 12 }}>可用: {record.availableUnits}</Text></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (_, record) => (<Tag color={record.status === 'Active' ? 'green' : record.status === 'Maintenance' ? 'orange' : 'default'}>{record.status === 'Active' ? '正常' : record.status === 'Maintenance' ? '维护中' : record.status}</Tag>) },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', width: 180, fixed: 'right', render: (_, record) => (<Space>
            <Button type="link" icon={<EyeOutlined />} onClick={() => setBuilding({ currentBuilding: record, detailVisible: true })}>{intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}</Button>
            <Button type="link" icon={<EditOutlined />} onClick={() => { setBuilding({ editingBuilding: record, modalVisible: true }); setForm({ attachments: (record.attachments || []).map((url, index) => { const fileName = url.split('/').pop() || 'file'; return { uid: `-${index}`, name: decodeURIComponent(fileName), status: 'done', url }; }) }); }}>{intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}</Button>
            <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { await api.deleteBuilding(record.id); buildingActionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }}><Button type="link" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button></Popconfirm>
        </Space>) },
    ];

    const unitColumns: ProColumns<PropertyUnit>[] = [
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.number', defaultMessage: '房源编号' }), dataIndex: 'unitNumber', sorter: true, width: 120, render: (_, record) => (<Space><HomeOutlined style={{ color: '#52c41a' }} /><a onClick={() => api.unit(record.id).then(r => { if (r.success && r.data) setUnit({ currentUnit: r.data, detailVisible: true }); })}>{record.unitNumber}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.building', defaultMessage: '所属楼宇' }), dataIndex: 'buildingName', sorter: true, width: 150 },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.floor', defaultMessage: '楼层' }), dataIndex: 'floor', sorter: true, width: 80, align: 'center', render: (_, record) => `${record.floor}F` },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.area', defaultMessage: '面积' }), dataIndex: 'area', sorter: true, width: 100, align: 'right', render: (_, record) => `${record.area} m²` },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.rent', defaultMessage: '月租金' }), dataIndex: 'monthlyRent', sorter: true, width: 120, align: 'right', render: (_, record) => `¥${record.monthlyRent?.toLocaleString()}` },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.type', defaultMessage: '类型' }), dataIndex: 'unitType', sorter: true, width: 100, render: (_, record) => (<Tag color={record.unitType === 'Office' ? 'blue' : record.unitType === 'Commercial' ? 'green' : 'purple'}>{record.unitType === 'Office' ? '办公' : record.unitType === 'Commercial' ? '商铺' : record.unitType || '其他'}</Tag>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (_, record) => { const statusMap: Record<string, { color: string; text: string }> = { Available: { color: 'green', text: '空置' }, Rented: { color: 'blue', text: '已出租' }, Reserved: { color: 'orange', text: '预留' }, Maintenance: { color: 'red', text: '维护' } }; const config = statusMap[record.status] || { color: 'default', text: record.status }; return <Tag color={config.color}>{config.text}</Tag>; } },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', width: 150, fixed: 'right', render: (_, record) => (<Space>
            <Button type="link" icon={<EyeOutlined />} onClick={() => api.unit(record.id).then(r => { if (r.success && r.data) setUnit({ currentUnit: r.data, detailVisible: true }); })}>{intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}</Button>
            <Button type="link" icon={<EditOutlined />} onClick={() => { setUnit({ editingUnit: record, modalVisible: true }); setForm({ attachments: (record.attachments || []).map((url, index) => { const fileName = url.split('/').pop() || 'file'; return { uid: `-${index}`, name: decodeURIComponent(fileName), status: 'done', url }; }) }); }}>{intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}</Button>
            <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { await api.deleteUnit(record.id); unitActionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }}><Button type="link" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button></Popconfirm>
        </Space>) },
    ];

    const parseAttachments = (urls: string[] = []) => urls.map((url, index) => { const fileName = url.split('/').pop() || 'file'; return { uid: `-${index}`, name: decodeURIComponent(fileName), status: 'done', url }; });
    const extractAttachmentUrls = (files: UploadFile[]) => files.map(item => { if (item.response?.data?.path) return item.response.data.path; return item.url; }).filter(Boolean) as string[];

    return (
        <PageContainer title={intl.formatMessage({ id: 'pages.park.asset.title', defaultMessage: '资产管理' })} extra={
            <Space>
                <Button icon={<ReloadOutlined />} onClick={() => { if (state.activeTab === 'buildings') buildingActionRef.current?.reload(); else unitActionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }}>{intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { if (state.activeTab === 'buildings') { setBuilding({ editingBuilding: null, modalVisible: true }); setForm({ attachments: [] }); } else { setUnit({ editingUnit: null, modalVisible: true }); setForm({ attachments: [] }); } }}>{state.activeTab === 'buildings' ? intl.formatMessage({ id: 'pages.park.asset.addBuilding', defaultMessage: '新增楼宇' }) : intl.formatMessage({ id: 'pages.park.asset.addUnit', defaultMessage: '新增房源' })}</Button>
            </Space>
        }>
            {state.statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.park.asset.stats.properties', defaultMessage: '物业总数' })} value={state.statistics.totalBuildings} icon={<BankOutlined />} color="#1890ff" suffix={state.statistics.totalBuildingsMoM !== undefined && (<div style={{ fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, color: state.statistics.totalBuildingsMoM >= 0 ? '#52c41a' : '#ff4d4f' }}>{state.statistics.totalBuildingsMoM >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}<span>{Math.abs(state.statistics.totalBuildingsMoM).toFixed(1)}%</span></div>)} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.park.asset.stats.units', defaultMessage: '房源总数' })} value={state.statistics.totalUnits} icon={<HomeOutlined />} color="#52c41a" suffix={<Text type="secondary" style={{ fontSize: 12 }}>可用: {state.statistics.availableUnits}</Text>} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.park.asset.stats.area', defaultMessage: '总面积 (m²)' })} value={state.statistics.totalArea?.toLocaleString()} icon={<AreaChartOutlined />} color="#722ed1" /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.park.asset.stats.occupancy', defaultMessage: '出租率' })} value={`${state.statistics.occupancyRate}%`} icon={<SyncOutlined />} color={state.statistics.occupancyRate >= 80 ? '#52c41a' : state.statistics.occupancyRate >= 50 ? '#faad14' : '#f5222d'} /></Col>
                </Row>
            )}

            <ProTable actionRef={actionRef} params={{ activeTab: state.activeTab }}
                request={((async (params: any) => {
                    const { current, pageSize, activeTab: tab } = params;
                    const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
                    if (tab === 'buildings' || !tab) { const res = await api.buildings({ page: current, pageSize, search: state.searchText, ...sortParams }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }
                    else { const res = await api.units({ page: current, pageSize, search: state.searchText, ...sortParams }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }
                }) as any)}
                columns={state.activeTab === 'buildings' ? buildingColumns as any : unitColumns as any} rowKey="id" search={false}
                onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
                toolBarRender={() => [<Input.Search key="search" placeholder="搜索..." style={{ width: 200 }} allowClear value={state.searchText} onChange={(e) => set({ searchText: e.target.value })} onSearch={(v) => { set({ searchText: v }); actionRef.current?.reload(); }} />]}
            />

            <ModalForm key={buildingState.editingBuilding?.id || 'create-building'}
                title={buildingState.editingBuilding ? intl.formatMessage({ id: 'pages.park.asset.editBuilding', defaultMessage: '编辑楼宇' }) : intl.formatMessage({ id: 'pages.park.asset.addBuilding', defaultMessage: '新增楼宇' })}
                open={buildingState.modalVisible} onOpenChange={(open) => { if (!open) setBuilding({ modalVisible: false, editingBuilding: null }); }}
                initialValues={buildingState.editingBuilding ? { name: buildingState.editingBuilding.name, buildingType: buildingState.editingBuilding.buildingType, address: buildingState.editingBuilding.address, totalFloors: buildingState.editingBuilding.totalFloors, totalArea: buildingState.editingBuilding.totalArea, yearBuilt: buildingState.editingBuilding.yearBuilt, deliveryDate: buildingState.editingBuilding.deliveryDate ? dayjs(buildingState.editingBuilding.deliveryDate) : undefined, status: buildingState.editingBuilding.status, description: buildingState.editingBuilding.description } : undefined}
                onFinish={async (values) => {
                    const data = { ...values, deliveryDate: values.deliveryDate?.toISOString(), attachments: extractAttachmentUrls(formState.attachments) };
                    const res = buildingState.editingBuilding ? await api.updateBuilding(buildingState.editingBuilding.id, data) : await api.createBuilding(data);
                    if (res.success) { setBuilding({ modalVisible: false, editingBuilding: null }); buildingActionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); api.allBuildings().then(r => { if (r.success && r.data) setForm({ buildings: r.data.queryable || [] }); }); }
                    return res.success;
                }} autoFocusFirstInput width={640}>
                <ProFormText name="name" label="楼宇名称" placeholder="请输入楼宇名称" rules={[{ required: true, message: '请输入楼宇名称' }]} />
                <ProFormSelect name="buildingType" label="楼宇类型" placeholder="请选择类型" options={[{ label: '办公楼', value: 'Office' }, { label: '商业楼', value: 'Commercial' }, { label: '综合楼', value: 'Mixed' }]} />
                <ProFormText name="address" label="地址" placeholder="请输入楼宇地址" />
                <Row gutter={16}>
                    <Col span={12}><ProFormText name="totalFloors" label="总楼层" placeholder="楼层数" rules={[{ required: true, message: '请输入楼层数' }]} fieldProps={{ type: 'number' }} /></Col>
                    <Col span={12}><ProFormText name="totalArea" label="总面积 (m²)" placeholder="总面积" rules={[{ required: true, message: '请输入面积' }]} fieldProps={{ type: 'number' }} /></Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}><ProFormText name="yearBuilt" label="建成年份" placeholder="建成年份" fieldProps={{ type: 'number' }} /></Col>
                    <Col span={8}><ProFormDatePicker name="deliveryDate" label="交付日期" placeholder="选择日期" /></Col>
                    <Col span={8}><ProFormSelect name="status" label="状态" placeholder="请选择状态" options={[{ label: '正常', value: 'Active' }, { label: '维护中', value: 'Maintenance' }, { label: '停用', value: 'Inactive' }]} /></Col>
                </Row>
                <ProFormText name="description" label="描述" placeholder="请输入描述信息" />
                <div style={{ marginBottom: 24 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>楼宇附件</Typography.Text>
                    <Upload action="/api/cloud-storage/upload" listType="picture" fileList={formState.attachments} onChange={({ fileList }) => setForm({ attachments: fileList })} headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }} data={(file) => ({ file, isPublic: false, description: 'Building Attachment' })}><Button icon={<UploadOutlined />}>上传附件</Button></Upload>
                </div>
            </ModalForm>

            <ModalForm key={unitState.editingUnit?.id || 'create-unit'}
                title={unitState.editingUnit ? intl.formatMessage({ id: 'pages.park.asset.editUnit', defaultMessage: '编辑房源' }) : intl.formatMessage({ id: 'pages.park.asset.addUnit', defaultMessage: '新增房源' })}
                open={unitState.modalVisible} onOpenChange={(open) => { if (!open) setUnit({ modalVisible: false, editingUnit: null }); }}
                initialValues={unitState.editingUnit ? { buildingId: unitState.editingUnit.buildingId, unitNumber: unitState.editingUnit.unitNumber, floor: unitState.editingUnit.floor, area: unitState.editingUnit.area, unitType: unitState.editingUnit.unitType, monthlyRent: unitState.editingUnit.monthlyRent, dailyRent: unitState.editingUnit.dailyRent, description: unitState.editingUnit.description } : undefined}
                onFinish={async (values) => {
                    const data = { ...values, attachments: extractAttachmentUrls(formState.attachments) };
                    const res = unitState.editingUnit ? await api.updateUnit(unitState.editingUnit.id, data) : await api.createUnit(data);
                    if (res.success) { setUnit({ modalVisible: false, editingUnit: null }); unitActionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }
                    return res.success;
                }} autoFocusFirstInput width={640}>
                <ProFormSelect name="buildingId" label="所属楼宇" placeholder="请选择楼宇" rules={[{ required: true, message: '请选择楼宇' }]} options={formState.buildings.map(b => ({ label: b.name, value: b.id }))} />
                <ProFormText name="unitNumber" label="房源编号" placeholder="例如：A-101" rules={[{ required: true, message: '请输入房源编号' }]} />
                <Row gutter={16}>
                    <Col span={8}><ProFormText name="floor" label="楼层" placeholder="楼层" rules={[{ required: true, message: '请输入楼层' }]} fieldProps={{ type: 'number' }} /></Col>
                    <Col span={8}><ProFormText name="area" label="面积 (m²)" placeholder="面积" rules={[{ required: true, message: '请输入面积' }]} fieldProps={{ type: 'number' }} /></Col>
                    <Col span={8}><ProFormSelect name="unitType" label="类型" placeholder="请选择类型" options={[{ label: '办公', value: 'Office' }, { label: '商铺', value: 'Commercial' }, { label: '仓储', value: 'Warehouse' }]} /></Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}><ProFormText name="monthlyRent" label="月租金 (元)" placeholder="月租金" rules={[{ required: true, message: '请输入月租金' }]} fieldProps={{ type: 'number' }} /></Col>
                    <Col span={12}><ProFormText name="dailyRent" label="日租金 (元/m²)" placeholder="日租金" fieldProps={{ type: 'number' }} /></Col>
                </Row>
                <ProFormText name="description" label="描述" placeholder="请输入描述信息" />
                <div style={{ marginBottom: 24 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>房源附件</Typography.Text>
                    <Upload action="/api/cloud-storage/upload" listType="picture" fileList={formState.attachments} onChange={({ fileList }) => setForm({ attachments: fileList })} headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }} data={(file) => ({ file, isPublic: false, description: 'Property Unit Attachment' })}><Button icon={<UploadOutlined />}>上传附件</Button></Upload>
                </div>
            </ModalForm>

            <Drawer title={buildingState.currentBuilding?.name || intl.formatMessage({ id: 'pages.park.asset.buildingDetail', defaultMessage: '楼宇详情' })} open={buildingState.detailVisible} onClose={(open) => { if (!open) setBuilding({ detailVisible: false, currentBuilding: null }); }} width={640}>
                {buildingState.currentBuilding && (<div>
                    <ProDescriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
                        <ProDescriptions.Item label="楼宇名称">{buildingState.currentBuilding.name}</ProDescriptions.Item>
                        <ProDescriptions.Item label="楼宇类型"><Tag color="blue">{buildingState.currentBuilding.buildingType || '综合'}</Tag></ProDescriptions.Item>
                        <ProDescriptions.Item label="地址" span={2}>{buildingState.currentBuilding.address || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="总楼层">{buildingState.currentBuilding.totalFloors}层</ProDescriptions.Item>
                        <ProDescriptions.Item label="建成年份">{buildingState.currentBuilding.yearBuilt || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="交付/取得日期">{buildingState.currentBuilding.deliveryDate ? dayjs(buildingState.currentBuilding.deliveryDate).format('YYYY-MM-DD') : '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="总面积">{buildingState.currentBuilding.totalArea?.toLocaleString()} m²</ProDescriptions.Item>
                        <ProDescriptions.Item label="已租面积">{buildingState.currentBuilding.rentedArea?.toLocaleString()} m²</ProDescriptions.Item>
                        <ProDescriptions.Item label="出租率"><Tag color={(buildingState.currentBuilding.occupancyRate || 0) >= 80 ? 'green' : (buildingState.currentBuilding.occupancyRate || 0) >= 50 ? 'orange' : 'red'}>{buildingState.currentBuilding.occupancyRate || 0}%</Tag></ProDescriptions.Item>
                        <ProDescriptions.Item label="房源总数">{buildingState.currentBuilding.totalUnits}</ProDescriptions.Item>
                        <ProDescriptions.Item label="可用房源">{buildingState.currentBuilding.availableUnits}</ProDescriptions.Item>
                        <ProDescriptions.Item label="状态"><Tag color={buildingState.currentBuilding.status === 'Active' ? 'green' : 'orange'}>{buildingState.currentBuilding.status === 'Active' ? '正常' : '维护中'}</Tag></ProDescriptions.Item>
                    </ProDescriptions>
                    {buildingState.currentBuilding.description && (<div><Title level={5}>描述</Title><Text>{buildingState.currentBuilding.description}</Text></div>)}
                </div>)}
            </Drawer>

            <Drawer title={unitState.currentUnit?.unitNumber || intl.formatMessage({ id: 'pages.park.asset.unitDetail', defaultMessage: '房源详情' })} open={unitState.detailVisible} onClose={(open) => { if (!open) setUnit({ detailVisible: false, currentUnit: null }); }} width={720}>
                {unitState.currentUnit && (<Space direction="vertical" style={{ width: '100%' }} size={24}>
                    <div>
                        <Title level={5} style={{ marginBottom: 16 }}>基本信息</Title>
                        <ProDescriptions bordered column={2} size="small">
                            <ProDescriptions.Item label="房源编号">{unitState.currentUnit.unitNumber}</ProDescriptions.Item>
                            <ProDescriptions.Item label="所属楼宇">{unitState.currentUnit.buildingName}</ProDescriptions.Item>
                            <ProDescriptions.Item label="所在楼层">{unitState.currentUnit.floor}F</ProDescriptions.Item>
                            <ProDescriptions.Item label="房源面积">{unitState.currentUnit.area} m²</ProDescriptions.Item>
                            <ProDescriptions.Item label="房源类型"><Tag color={unitState.currentUnit.unitType === 'Office' ? 'blue' : unitState.currentUnit.unitType === 'Commercial' ? 'green' : 'purple'}>{unitState.currentUnit.unitType === 'Office' ? '办公' : unitState.currentUnit.unitType === 'Commercial' ? '商铺' : unitState.currentUnit.unitType || '其他'}</Tag></ProDescriptions.Item>
                            <ProDescriptions.Item label="月租金">¥{unitState.currentUnit.monthlyRent?.toLocaleString()}</ProDescriptions.Item>
                            <ProDescriptions.Item label="日租金">{unitState.currentUnit.dailyRent ? `¥${unitState.currentUnit.dailyRent?.toLocaleString()}/m²` : '-'}</ProDescriptions.Item>
                            <ProDescriptions.Item label="状态"><Tag color={unitState.currentUnit.status === 'Available' ? 'green' : 'blue'}>{unitState.currentUnit.status === 'Available' ? '空置' : '已出租'}</Tag></ProDescriptions.Item>
                            <ProDescriptions.Item label="当前租客">{unitState.currentUnit.currentTenantName || '-'}</ProDescriptions.Item>
                            <ProDescriptions.Item label="租期到期" span={2}>{unitState.currentUnit.leaseEndDate ? dayjs(unitState.currentUnit.leaseEndDate).format('YYYY-MM-DD') : '-'}</ProDescriptions.Item>
                        </ProDescriptions>
                        {unitState.currentUnit.description && (<div style={{ marginTop: 16 }}><Text type="secondary">描述信息：</Text><Text>{unitState.currentUnit.description}</Text></div>)}
                    </div>
                    <div>
                        <Title level={5} style={{ marginBottom: 16 }}>出租历史 ({unitState.currentUnit.leaseHistory?.length || 0})</Title>
                        <ProTable request={async () => ({ data: unitState.currentUnit?.leaseHistory || [], total: unitState.currentUnit?.leaseHistory?.length || 0, success: true })}
                            columns={[{ title: '租户名称', dataIndex: 'tenantName', key: 'tenantName' }, { title: '合同编号', dataIndex: 'contractNumber', key: 'contractNumber' }, { title: '租期', key: 'period', render: (_, record: any) => (<span style={{ fontSize: 12 }}>{dayjs(record.startDate).format('YYYY-MM-DD')} ~ {dayjs(record.endDate).format('YYYY-MM-DD')}</span>) }, { title: '月租金', dataIndex: 'monthlyRent', key: 'monthlyRent', render: (val: any) => `¥${val?.toLocaleString()}` }, { title: '状态', dataIndex: 'status', key: 'status', render: (status: any) => { const statusColors: Record<string, string> = { Active: 'green', Expired: 'default', Renewed: 'cyan', Terminated: 'red' }; return <Tag color={statusColors[status] || 'blue'}>{status}</Tag>; } }]}
                            rowKey="id" pagination={false} search={false} toolBarRender={false} />
                    </div>
                </Space>)}
            </Drawer>
        </PageContainer>
    );
};

export default AssetManagement;
