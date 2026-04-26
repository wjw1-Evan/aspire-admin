import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { Tag, Space, Row, Col, Button, Input, Popconfirm, Typography, Upload, DatePicker, Tabs, App } from 'antd';
import { Drawer } from 'antd';
import type { UploadFile } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDatePicker } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HomeOutlined, BankOutlined, AreaChartOutlined, SyncOutlined, ReloadOutlined, UploadOutlined, ArrowUpOutlined, ArrowDownOutlined, SearchOutlined } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import { ApiResponse, PagedResult } from '@/types';
import dayjs from 'dayjs';
import { getErrorMessage } from '@/utils/getErrorMessage';

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
        request<ApiResponse<AssetStatistics>>('/apiservice/api/park/asset/statistics', { method: 'GET', params: { startDate, endDate } }),
    buildings: (params: any) =>
        request<ApiResponse<PagedResult<Building>>>('/apiservice/api/park/buildings/list', { params }),
    getBuilding: (id: string) =>
        request<ApiResponse<Building>>(`/apiservice/api/park/buildings/${id}`),
    createBuilding: (data: Partial<Building>) =>
        request<ApiResponse<Building>>('/apiservice/api/park/buildings', { method: 'POST', data }),
    updateBuilding: (id: string, data: Partial<Building>) =>
        request<ApiResponse<Building>>(`/apiservice/api/park/buildings/${id}`, { method: 'PUT', data }),
    deleteBuilding: (id: string) =>
        request<ApiResponse<boolean>>(`/apiservice/api/park/buildings/${id}`, { method: 'DELETE' }),
    allBuildings: () =>
        request<ApiResponse<PagedResult<Building>>>('/apiservice/api/park/buildings/list', { params: { page: 1, pageSize: 1000 } }),
    units: (params: any) =>
        request<ApiResponse<PagedResult<PropertyUnit>>>('/apiservice/api/park/properties/list', { params }),
    unit: (id: string) =>
        request<ApiResponse<PropertyUnit>>(`/apiservice/api/park/properties/${id}`, { method: 'GET' }),
    createUnit: (data: Partial<PropertyUnit>) =>
        request<ApiResponse<PropertyUnit>>('/apiservice/api/park/properties', { method: 'POST', data }),
    updateUnit: (id: string, data: Partial<PropertyUnit>) =>
        request<ApiResponse<PropertyUnit>>(`/apiservice/api/park/properties/${id}`, { method: 'PUT', data }),
    deleteUnit: (id: string) =>
        request<ApiResponse<boolean>>(`/apiservice/api/park/properties/${id}`, { method: 'DELETE' }),
};

const AssetManagement: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const buildingActionRef = useRef<ActionType | undefined>(undefined);
    const unitActionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as AssetStatistics | null,
        activeTab: 'buildings',
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
        search: '',
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const [buildingState, setBuildingState] = useState({
        modalVisible: false, detailVisible: false, detailLoading: false,
        editingBuilding: null as Building | null, currentBuilding: null as Building | null,
    });
    const setBuilding = (partial: Partial<typeof buildingState>) => setBuildingState(prev => ({ ...prev, ...partial }));

    const [unitState, setUnitState] = useState({
        modalVisible: false, detailVisible: false, detailLoading: false,
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

    const handleViewBuilding = async (id: string) => {
        setBuilding({ currentBuilding: null, detailVisible: true, detailLoading: true });
        try {
            const res = await api.getBuilding(id);
            if (res.success && res.data) {
                setBuilding({ currentBuilding: res.data });
            }
        } catch (error) {
            console.error('Failed to load building details:', error);
        } finally {
            setBuilding({ detailLoading: false });
        }
    };

    const handleViewUnit = async (id: string) => {
        setUnit({ currentUnit: null, detailVisible: true, detailLoading: true });
        try {
            const res = await api.unit(id);
            if (res.success && res.data) {
                setUnit({ currentUnit: res.data });
            }
        } catch (error) {
            console.error('Failed to load unit details:', error);
        } finally {
            setUnit({ detailLoading: false });
        }
    };

    const buildingColumns: ProColumns<Building>[] = [
        { title: intl.formatMessage({ id: 'pages.park.asset.building.name', defaultMessage: '楼宇名称' }), dataIndex: 'name', sorter: true, width: 160, render: (_, record) => (<Space><BankOutlined style={{ color: '#1890ff' }} /><a onClick={() => handleViewBuilding(record.id)}>{record.name}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.address', defaultMessage: '地址' }), dataIndex: 'address', sorter: true, width: 200, ellipsis: true, render: (_, record) => record.address || '-' },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.type', defaultMessage: '类型' }), dataIndex: 'buildingType', sorter: true, width: 100, render: (_, record) => (<Tag color={record.buildingType === 'Office' ? 'blue' : record.buildingType === 'Commercial' ? 'green' : 'orange'}>{record.buildingType === 'Office' ? '办公楼' : record.buildingType === 'Commercial' ? '商业楼' : record.buildingType || '综合'}</Tag>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.floors', defaultMessage: '楼层' }), dataIndex: 'totalFloors', sorter: true, width: 80, align: 'center', render: (_, record) => `${record.totalFloors}层` },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.area', defaultMessage: '总面积' }), dataIndex: 'totalArea', sorter: true, width: 120, align: 'right', render: (_, record) => `${record.totalArea?.toLocaleString()} m²` },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.occupancy', defaultMessage: '出租率' }), dataIndex: 'occupancyRate', sorter: true, width: 120, render: (_, record) => (<Tag color={(record.occupancyRate || 0) >= 80 ? 'success' : (record.occupancyRate || 0) >= 50 ? 'processing' : 'exception'}>{record.occupancyRate || 0}%</Tag>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.units', defaultMessage: '房源数量' }), dataIndex: 'totalUnits', sorter: true, width: 140, align: 'center', render: (totalUnits, record) => (<Space vertical align="center"><Button type="link" size="small" style={{ fontWeight: 'bold', fontSize: 16, padding: 0 }} onClick={() => { set({ activeTab: 'units' }); unitActionRef.current?.reload(); }}>{totalUnits}</Button><Text type="secondary" style={{ fontSize: 12 }}>可用: {record.availableUnits}</Text></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.building.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (_, record) => (<Tag color={record.status === 'Active' ? 'green' : record.status === 'Maintenance' ? 'orange' : 'default'}>{record.status === 'Active' ? '正常' : record.status === 'Maintenance' ? '维护中' : record.status}</Tag>) },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
            <Space size={4}>
                <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleViewBuilding(record.id)}>{intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}</Button>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setBuilding({ editingBuilding: record, modalVisible: true }); setForm({ attachments: (record.attachments || []).map((url, index) => { const fileName = url.split('/').pop() || 'file'; return { uid: `-${index}`, name: decodeURIComponent(fileName), status: 'done', url }; }) }); }}>{intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}</Button>
                <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { const res = await api.deleteBuilding(record.id); if (res.success) { message.success('删除成功'); buildingActionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); } else { message.error(getErrorMessage(res, 'pages.park.asset.deleteFailed')); } }}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button>
                </Popconfirm>
            </Space>
        ) },
    ];

    const unitColumns: ProColumns<PropertyUnit>[] = [
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.number', defaultMessage: '房源编号' }), dataIndex: 'unitNumber', sorter: true, width: 120, render: (_, record) => (<Space><HomeOutlined style={{ color: '#52c41a' }} /><a onClick={() => handleViewUnit(record.id)}>{record.unitNumber}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.building', defaultMessage: '所属楼宇' }), dataIndex: 'buildingName', sorter: true, width: 150 },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.floor', defaultMessage: '楼层' }), dataIndex: 'floor', sorter: true, width: 80, align: 'center', render: (_, record) => `${record.floor}F` },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.area', defaultMessage: '面积' }), dataIndex: 'area', sorter: true, width: 100, align: 'right', render: (_, record) => `${record.area} m²` },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.rent', defaultMessage: '月租金' }), dataIndex: 'monthlyRent', sorter: true, width: 120, align: 'right', render: (_, record) => `¥${record.monthlyRent?.toLocaleString()}` },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.type', defaultMessage: '类型' }), dataIndex: 'unitType', sorter: true, width: 100, render: (_, record) => (<Tag color={record.unitType === 'Office' ? 'blue' : record.unitType === 'Commercial' ? 'green' : 'purple'}>{record.unitType === 'Office' ? '办公' : record.unitType === 'Commercial' ? '商铺' : record.unitType || '其他'}</Tag>) },
        { title: intl.formatMessage({ id: 'pages.park.asset.unit.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (_, record) => { const statusMap: Record<string, { color: string; text: string }> = { Available: { color: 'green', text: '空置' }, Rented: { color: 'blue', text: '已出租' }, Reserved: { color: 'orange', text: '预留' }, Maintenance: { color: 'red', text: '维护' } }; const config = statusMap[record.status] || { color: 'default', text: record.status }; return <Tag color={config.color}>{config.text}</Tag>; } },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
            <Space size={4}>
                <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleViewUnit(record.id)}>{intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}</Button>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setUnit({ editingUnit: record, modalVisible: true }); setForm({ attachments: (record.attachments || []).map((url, index) => { const fileName = url.split('/').pop() || 'file'; return { uid: `-${index}`, name: decodeURIComponent(fileName), status: 'done', url }; }) }); }}>{intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}</Button>
                <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { const res = await api.deleteUnit(record.id); if (res.success) { message.success('删除成功'); unitActionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); } else { message.error(getErrorMessage(res, 'pages.park.asset.deleteFailed')); } }}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button>
                </Popconfirm>
            </Space>
        ) },
    ];

    const parseAttachments = (urls: string[] = []) => urls.map((url, index) => { const fileName = url.split('/').pop() || 'file'; return { uid: `-${index}`, name: decodeURIComponent(fileName), status: 'done', url }; });
    const extractAttachmentUrls = (files: UploadFile[]) => files.map(item => { if (item.response?.data?.path) return item.response.data.path; return item.url; }).filter(Boolean) as string[];

    return (
        <PageContainer>
            <ProCard>
                <Tabs activeKey={state.activeTab} onChange={(key) => set({ activeTab: key })} items={[
                    { key: 'buildings', label: <Space><BankOutlined />{intl.formatMessage({ id: 'pages.park.asset.buildings', defaultMessage: '楼宇管理' })}</Space>, children: <ProTable<Building> actionRef={buildingActionRef} headerTitle={<Space size={24}><Space><BankOutlined />资产管理</Space><Space size={12}><Tag color="blue">楼宇 {state.statistics?.totalBuildings || 0}</Tag><Tag color="green">房源 {state.statistics?.totalUnits || 0}</Tag><Tag color="purple">总面积 {state.statistics?.totalArea?.toLocaleString() || 0} m²</Tag><Tag color={(state.statistics?.occupancyRate ?? 0) >= 80 ? 'success' : (state.statistics?.occupancyRate ?? 0) >= 50 ? 'warning' : 'error'}>出租率 {state.statistics?.occupancyRate || 0}%</Tag></Space></Space>} request={async (params: any) => { const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined; const res = await api.buildings({ page: current, pageSize, search: state.search, ...sortParams }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={buildingColumns} rowKey="id" search={false} onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })} toolBarRender={() => [<Input.Search key="search" placeholder="搜索..." allowClear value={state.search} onChange={(e) => set({ search: e.target.value })} onSearch={(v) => { set({ search: v }); buildingActionRef.current?.reload(); }} style={{ width: 260, marginRight: 8 }} prefix={<SearchOutlined />} />, <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setBuilding({ editingBuilding: null, modalVisible: true }); setForm({ attachments: [] }); }}>新增楼宇</Button>]} scroll={{ x: 1200 }} /> },
                    { key: 'units', label: <Space><HomeOutlined />{intl.formatMessage({ id: 'pages.park.asset.units', defaultMessage: '房源管理' })}</Space>, children: <ProTable<PropertyUnit> actionRef={unitActionRef} headerTitle={<Space size={24}><Space><HomeOutlined />房源管理</Space><Space size={12}><Tag color="blue">房源 {state.statistics?.totalUnits || 0}</Tag><Tag color="green">可用 {state.statistics?.availableUnits || 0}</Tag><Tag color="purple">总面积 {state.statistics?.totalArea?.toLocaleString() || 0} m²</Tag><Tag color={(state.statistics?.occupancyRate ?? 0) >= 80 ? 'success' : (state.statistics?.occupancyRate ?? 0) >= 50 ? 'warning' : 'error'}>出租率 {state.statistics?.occupancyRate || 0}%</Tag></Space></Space>} request={async (params: any) => { const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined; const res = await api.units({ page: current, pageSize, search: state.search, ...sortParams }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={unitColumns} rowKey="id" search={false} onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })} toolBarRender={() => [<Input.Search key="search" placeholder="搜索..." allowClear value={state.search} onChange={(e) => set({ search: e.target.value })} onSearch={(v) => { set({ search: v }); unitActionRef.current?.reload(); }} style={{ width: 260, marginRight: 8 }} prefix={<SearchOutlined />} />, <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setUnit({ editingUnit: null, modalVisible: true }); setForm({ attachments: [] }); }}>新增房源</Button>]} scroll={{ x: 1200 }} /> },
                ]} />
            </ProCard>

            <ModalForm key={buildingState.editingBuilding?.id || 'create-building'}
                title={buildingState.editingBuilding ? intl.formatMessage({ id: 'pages.park.asset.editBuilding', defaultMessage: '编辑楼宇' }) : intl.formatMessage({ id: 'pages.park.asset.addBuilding', defaultMessage: '新增楼宇' })}
                open={buildingState.modalVisible} onOpenChange={(open) => { if (!open) setBuilding({ modalVisible: false, editingBuilding: null }); }}
                initialValues={buildingState.editingBuilding ? { name: buildingState.editingBuilding.name, buildingType: buildingState.editingBuilding.buildingType, address: buildingState.editingBuilding.address, totalFloors: buildingState.editingBuilding.totalFloors, totalArea: buildingState.editingBuilding.totalArea, yearBuilt: buildingState.editingBuilding.yearBuilt, deliveryDate: buildingState.editingBuilding.deliveryDate ? dayjs(buildingState.editingBuilding.deliveryDate) : undefined, status: buildingState.editingBuilding.status, description: buildingState.editingBuilding.description } : undefined}
                onFinish={async (values) => {
                    const deliveryDateVal = values.deliveryDate?.toISOString ? values.deliveryDate.toISOString() : values.deliveryDate;
                    const data = { ...values, deliveryDate: deliveryDateVal, attachments: extractAttachmentUrls(formState.attachments) };
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
                    <Upload action="/apiservice/api/cloud-storage/upload" listType="picture" fileList={formState.attachments} onChange={({ fileList }) => setForm({ attachments: fileList })} headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }} data={(file) => ({ file, isPublic: false, description: 'Building Attachment' })}><Button icon={<UploadOutlined />}>上传附件</Button></Upload>
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
                    <Upload action="/apiservice/api/cloud-storage/upload" listType="picture" fileList={formState.attachments} onChange={({ fileList }) => setForm({ attachments: fileList })} headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }} data={(file) => ({ file, isPublic: false, description: 'Property Unit Attachment' })}><Button icon={<UploadOutlined />}>上传附件</Button></Upload>
                </div>
            </ModalForm>

            <Drawer title={buildingState.currentBuilding?.name || intl.formatMessage({ id: 'pages.park.asset.buildingDetail', defaultMessage: '楼宇详情' })} open={buildingState.detailVisible} onClose={() => { setBuilding({ detailVisible: false, currentBuilding: null }); }} size="large" loading={buildingState.detailLoading}>
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

            <Drawer title={unitState.currentUnit?.unitNumber || intl.formatMessage({ id: 'pages.park.asset.unitDetail', defaultMessage: '房源详情' })} open={unitState.detailVisible} onClose={() => { setUnit({ detailVisible: false, currentUnit: null }); }} size="large" loading={unitState.detailLoading}>
                {unitState.currentUnit && (<Space orientation="vertical" style={{ width: '100%' }} size={24}>
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
