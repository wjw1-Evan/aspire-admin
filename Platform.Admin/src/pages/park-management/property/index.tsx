import {
  DeleteOutlined,
  EditOutlined,
  HomeOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components/es/descriptions';
import { ModalForm, ProFormSelect, ProFormText } from '@ant-design/pro-components/es/form';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { request, useIntl } from '@umijs/max';
import type { UploadFile } from 'antd';
import { App, Button, Col, Drawer, Input, Popconfirm, Row, Space, Tag, Typography, Upload } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiResponse, PagedResult } from '@/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

const { Text, Title } = Typography;

interface Building {
  id: string;
  name: string;
}

interface PropertyUnit {
  id: string;
  buildingId: string;
  buildingName?: string;
  unitNumber: string;
  floor: number;
  area: number;
  monthlyRent: number;
  propertyFee?: number;
  unitType: string;
  description?: string;
  status: string;
  currentTenantId?: string;
  currentTenantName?: string;
  leaseEndDate?: string;
  facilities?: string[];
  images?: string[];
  attachments?: string[];
  leaseHistory?: LeaseContract[];
}

interface LeaseContract {
  id: string;
  tenantName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
}

interface AssetStatistics {
  totalBuildings: number;
  totalArea: number;
  totalUnits: number;
  availableUnits: number;
  rentedUnits: number;
  occupancyRate: number;
  totalRentableArea: number;
  rentedArea: number;
  occupancyRateYoY?: number;
  occupancyRateMoM?: number;
  totalBuildingsYoY?: number;
  totalBuildingsMoM?: number;
}

const api = {
  statistics: (startDate?: string, endDate?: string) =>
    request<ApiResponse<AssetStatistics>>('/apiservice/api/park/asset/statistics', {
      method: 'GET',
      params: { startDate, endDate },
    }),
  units: (params: any) =>
    request<ApiResponse<PagedResult<PropertyUnit>>>('/apiservice/api/park/properties/list', { params }),
  unit: (id: string) => request<ApiResponse<PropertyUnit>>(`/apiservice/api/park/properties/${id}`, { method: 'GET' }),
  createUnit: (data: Partial<PropertyUnit>) =>
    request<ApiResponse<PropertyUnit>>('/apiservice/api/park/properties', { method: 'POST', data }),
  updateUnit: (id: string, data: Partial<PropertyUnit>) =>
    request<ApiResponse<PropertyUnit>>(`/apiservice/api/park/properties/${id}`, { method: 'PUT', data }),
  deleteUnit: (id: string) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/properties/${id}`, { method: 'DELETE' }),
  allBuildings: () =>
    request<ApiResponse<PagedResult<Building>>>('/apiservice/api/park/buildings/list', {
      params: { current: 1, pageSize: 1000 },
    }),
};

const PropertyManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const unitActionRef = useRef<ActionType | undefined>(undefined);

  const [statistics, setStatistics] = useState<AssetStatistics | null>(null);
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingUnit, setEditingUnit] = useState<PropertyUnit | null>(null);
  const [currentUnit, setCurrentUnit] = useState<PropertyUnit | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [attachments, setAttachments] = useState<UploadFile[]>([]);

  useEffect(() => {
    api.statistics().then((r) => {
      if (r.success && r.data) setStatistics(r.data);
    });
    api.allBuildings()
      .then((r) => {
        if (r.success && r.data) setBuildings(r.data.queryable || []);
      })
      .catch((err) => {
        console.error('Failed to load buildings for selector:', err);
      });
  }, []);

  const handleViewUnit = async (id: string) => {
    setCurrentUnit(null);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await api.unit(id);
      if (res.success && res.data) {
        setCurrentUnit(res.data);
      }
    } catch (error) {
      console.error('Failed to load unit details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    const res = await api.deleteUnit(id);
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.park.asset.deleteSuccess' }));
      unitActionRef.current?.reload();
      api.statistics().then((r) => {
        if (r.success && r.data) setStatistics(r.data);
      });
    } else {
      message.error(getErrorMessage(res, 'pages.park.asset.deleteFailed'));
    }
  };

  const mapAttachments = (urls: string[] = []) =>
    urls.map((url, index) => {
      const fileName = url.split('/').pop() || 'file';
      return { uid: `-${index}`, name: decodeURIComponent(fileName), status: 'done' as const, url };
    });

  const renderUnitType = (unitType?: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      Office: { color: 'blue', text: intl.formatMessage({ id: 'pages.park.asset.unitType.office' }) },
      Commercial: { color: 'green', text: intl.formatMessage({ id: 'pages.park.asset.unitType.commercial' }) },
      Warehouse: { color: 'purple', text: intl.formatMessage({ id: 'pages.park.asset.unitType.warehouse' }) },
      Residential: { color: 'cyan', text: intl.formatMessage({ id: 'pages.park.asset.unitType.residential' }) },
    };
    const config = typeMap[unitType || ''] || { color: 'default', text: unitType || '' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const renderUnitStatus = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      Available: { color: 'green', text: intl.formatMessage({ id: 'pages.park.asset.unit.status.available' }) },
      Rented: { color: 'blue', text: intl.formatMessage({ id: 'pages.park.asset.unit.status.rented' }) },
      Reserved: { color: 'orange', text: intl.formatMessage({ id: 'pages.park.asset.unit.status.reserved' }) },
      Maintenance: { color: 'red', text: intl.formatMessage({ id: 'pages.park.asset.unit.status.maintenance' }) },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const unitColumns: ProColumns<PropertyUnit>[] = [
    {
      title: intl.formatMessage({ id: 'pages.park.asset.unit.number' }),
      dataIndex: 'unitNumber',
      sorter: true,
      width: 120,
      render: (_, record) => (
        <Space>
          <HomeOutlined style={{ color: '#52c41a' }} />
          {record.unitNumber}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.unit.building' }),
      dataIndex: 'buildingName',
      sorter: true,
      width: 150,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.unit.floor' }),
      dataIndex: 'floor',
      sorter: true,
      width: 80,
      align: 'center',
      render: (_, record) => `${record.floor}F`,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.unit.area' }),
      dataIndex: 'area',
      sorter: true,
      width: 100,
      align: 'right',
      render: (_, record) => `${record.area} m²`,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.unit.rent' }),
      dataIndex: 'monthlyRent',
      sorter: true,
      width: 120,
      align: 'right',
      render: (_, record) => `¥${record.monthlyRent?.toLocaleString()}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.propertyFee' }),
      dataIndex: 'propertyFee',
      width: 120,
      align: 'right',
      render: (_, record) => (record.propertyFee ? `¥${record.propertyFee.toLocaleString()}` : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.unit.type' }),
      dataIndex: 'unitType',
      sorter: true,
      width: 100,
      render: (_, record) => renderUnitType(record.unitType),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.unit.status' }),
      dataIndex: 'status',
      sorter: true,
      width: 100,
      render: (_, record) => renderUnitStatus(record.status),
    },
    {
      title: intl.formatMessage({ id: 'common.action' }),
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUnit(record);
              setModalVisible(true);
              setAttachments(mapAttachments(record.attachments));
            }}
          >
            {intl.formatMessage({ id: 'common.edit' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'common.confirmDelete' })}
            onConfirm={() => handleDeleteUnit(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'common.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const extractAttachmentUrls = (files: UploadFile[]) =>
    files
      .map((item) => {
        if (item.response?.data?.path) return item.response.data.path;
        return item.url;
      })
      .filter(Boolean) as string[];

  return (
    <PageContainer>
      <ProTable<PropertyUnit>
        actionRef={unitActionRef}
        headerTitle={
          <Space size={24}>
            <Space>
              <HomeOutlined />
              房源管理
            </Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.park.asset.units' })} {statistics?.totalUnits || 0}</Tag>
              <Tag color="green">{intl.formatMessage({ id: 'pages.park.asset.available' })} {statistics?.availableUnits || 0}</Tag>
              <Tag color="purple">总面积 {statistics?.totalArea?.toLocaleString() || 0} m²</Tag>
              <Tag
                color={
                  (statistics?.occupancyRate ?? 0) >= 80
                    ? 'success'
                    : (statistics?.occupancyRate ?? 0) >= 50
                      ? 'warning'
                      : 'error'
                }
              >
                出租率 {statistics?.occupancyRate || 0}%
              </Tag>
            </Space>
          </Space>
        }
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.units({ ...params, search, sort, filter });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={unitColumns}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(v) => {
              setSearch(v);
              unitActionRef.current?.reload();
            }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUnit(null);
              setModalVisible(true);
              setAttachments([]);
            }}
          >
            {intl.formatMessage({ id: 'pages.park.asset.addUnit' })}
          </Button>,
        ]}
        scroll={{ x: 1200 }}
        onRow={(record) => ({
          onClick: () => handleViewUnit(record.id),
          style: { cursor: 'pointer' },
        })}
      />

      <ModalForm
        key={editingUnit?.id || 'create-unit'}
        title={
          editingUnit
            ? intl.formatMessage({ id: 'pages.park.asset.editUnit' })
            : intl.formatMessage({ id: 'pages.park.asset.addUnit' })
        }
        open={modalVisible}
        onOpenChange={(open) => {
          if (!open) {
            setModalVisible(false);
            setEditingUnit(null);
          }
        }}
        initialValues={
          editingUnit
            ? {
                buildingId: editingUnit.buildingId,
                unitNumber: editingUnit.unitNumber,
                floor: editingUnit.floor,
                area: editingUnit.area,
                unitType: editingUnit.unitType,
                monthlyRent: editingUnit.monthlyRent,
                propertyFee: editingUnit.propertyFee,
                description: editingUnit.description,
              }
            : undefined
        }
        onFinish={async (values) => {
          const data = { ...values, attachments: extractAttachmentUrls(attachments) };
          const res = editingUnit
            ? await api.updateUnit(editingUnit.id, data)
            : await api.createUnit(data);
          if (res.success) {
            setModalVisible(false);
            setEditingUnit(null);
            unitActionRef.current?.reload();
            api.statistics().then((r) => {
              if (r.success && r.data) setStatistics(r.data);
            });
          }
          return res.success;
        }}
        autoFocusFirstInput
        width={640}
      >
        <ProFormSelect
          name="buildingId"
          label={intl.formatMessage({ id: 'pages.park.asset.buildingId' })}
          placeholder={intl.formatMessage({ id: 'pages.park.asset.buildingIdPlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.buildingIdRequired' }) }]}
          options={buildings.map((b) => ({ label: b.name, value: b.id }))}
        />
        <ProFormText
          name="unitNumber"
          label={intl.formatMessage({ id: 'pages.park.asset.unitNumber' })}
          placeholder={intl.formatMessage({ id: 'pages.park.asset.unitNumberPlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.unitNumberRequired' }) }]}
        />
        <Row gutter={16}>
          <Col span={8}>
            <ProFormText
              name="floor"
              label={intl.formatMessage({ id: 'pages.park.asset.floor' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.floorPlaceholder' })}
              rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.floorRequired' }) }]}
              fieldProps={{ type: 'number' }}
            />
          </Col>
          <Col span={8}>
            <ProFormText
              name="area"
              label={intl.formatMessage({ id: 'pages.park.asset.area' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.areaPlaceholder' })}
              rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.areaRequired' }) }]}
              fieldProps={{ type: 'number' }}
            />
          </Col>
          <Col span={8}>
            <ProFormSelect
              name="unitType"
              label={intl.formatMessage({ id: 'pages.park.asset.unitType' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.unitTypePlaceholder' })}
              options={[
                { label: intl.formatMessage({ id: 'pages.park.asset.unitType.office' }), value: 'Office' },
                { label: intl.formatMessage({ id: 'pages.park.asset.unitType.commercial' }), value: 'Commercial' },
                { label: intl.formatMessage({ id: 'pages.park.asset.unitType.warehouse' }), value: 'Warehouse' },
                { label: intl.formatMessage({ id: 'pages.park.asset.unitType.residential' }), value: 'Residential' },
              ]}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <ProFormText
              name="monthlyRent"
              label={intl.formatMessage({ id: 'pages.park.asset.monthlyRent' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.monthlyRentPlaceholder' })}
              initialValue={0}
              rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.monthlyRentRequired' }) }]}
              fieldProps={{ type: 'number' }}
            />
          </Col>
          <Col span={8}>
            <ProFormText
              name="propertyFee"
              label={intl.formatMessage({ id: 'pages.park.asset.propertyFee' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.propertyFeePlaceholder' })}
              initialValue={0}
              rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.propertyFeeRequired' }) }]}
              fieldProps={{ type: 'number' }}
            />
          </Col>
        </Row>
        <ProFormText
          name="description"
          label={intl.formatMessage({ id: 'pages.park.asset.description' })}
          placeholder={intl.formatMessage({ id: 'pages.park.asset.descriptionPlaceholder' })}
        />
        <div style={{ marginBottom: 24 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            {intl.formatMessage({ id: 'pages.park.asset.attachmentsLabel' })}
          </Typography.Text>
          <Upload
            action="/apiservice/api/cloud-storage/upload"
            listType="picture"
            fileList={attachments}
            onChange={({ fileList }) => setAttachments(fileList)}
            headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }}
            data={(file) => ({ file, isPublic: false, description: 'Property Unit Attachment' })}
          >
            <Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.park.asset.uploadAttachment' })}</Button>
          </Upload>
        </div>
      </ModalForm>

      <Drawer
        title={currentUnit?.unitNumber || intl.formatMessage({ id: 'pages.park.asset.unitDetail' })}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setCurrentUnit(null);
        }}
        size="large"
        loading={detailLoading}
      >
        {currentUnit && (
          <Space orientation="vertical" style={{ width: '100%' }} size={24}>
            <div>
              <Title level={5} style={{ marginBottom: 16 }}>
                {intl.formatMessage({ id: 'pages.park.asset.basicInfo' })}
              </Title>
              <ProDescriptions bordered column={2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.unitNumber' })}>
                  {currentUnit.unitNumber}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.buildingName' })}>
                  {currentUnit.buildingName}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.floor' })}>
                  {currentUnit.floor}F
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.area' })}>
                  {currentUnit.area} m²
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.unitType' })}>
                  <Tag
                    color={
                      currentUnit.unitType === 'Office'
                        ? 'blue'
                        : currentUnit.unitType === 'Commercial'
                          ? 'green'
                          : currentUnit.unitType === 'Residential'
                            ? 'cyan'
                            : 'purple'
                    }
                  >
                    {intl.formatMessage({
                      id: `pages.park.asset.unitType.${currentUnit.unitType?.toLowerCase()}`,
                    })}
                  </Tag>
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.monthlyRent' })}>
                  ¥{currentUnit.monthlyRent?.toLocaleString()}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.propertyFee' })}>
                  {currentUnit.propertyFee ? `¥${currentUnit.propertyFee?.toLocaleString()}` : '-'}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.status' })}>
                  <Tag color={currentUnit.status === 'Available' ? 'green' : 'blue'}>
                    {intl.formatMessage({
                      id: `pages.park.asset.unit.status.${currentUnit.status?.toLowerCase()}`,
                    })}
                  </Tag>
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.currentTenant' })}>
                  {currentUnit.currentTenantName || '-'}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.leaseEndDate' })} span={2}>
                  {currentUnit.leaseEndDate ? dayjs(currentUnit.leaseEndDate).format('YYYY-MM-DD') : '-'}
                </ProDescriptions.Item>
              </ProDescriptions>
              {currentUnit.description && (
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">{intl.formatMessage({ id: 'pages.park.asset.descriptionInfo' })}：</Text>
                  <Text>{currentUnit.description}</Text>
                </div>
              )}
            </div>
            <div>
              <Title level={5} style={{ marginBottom: 16 }}>
                {intl.formatMessage({ id: 'pages.park.asset.rentalHistory' })} (
                {currentUnit.leaseHistory?.length || 0})
              </Title>
              <ProTable
                request={async () => ({
                  data: currentUnit?.leaseHistory || [],
                  total: currentUnit?.leaseHistory?.length || 0,
                  success: true,
                })}
                columns={[
                  {
                    title: intl.formatMessage({ id: 'pages.park.asset.tenantName' }),
                    dataIndex: 'tenantName',
                    key: 'tenantName',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.park.asset.contractNumber' }),
                    dataIndex: 'contractNumber',
                    key: 'contractNumber',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.park.asset.leaseTerm' }),
                    key: 'period',
                    render: (_, record: any) => (
                      <span style={{ fontSize: 12 }}>
                        {dayjs(record.startDate).format('YYYY-MM-DD')} ~ {dayjs(record.endDate).format('YYYY-MM-DD')}
                      </span>
                    ),
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.park.asset.monthlyRent' }),
                    dataIndex: 'monthlyRent',
                    key: 'monthlyRent',
                    render: (val: any) => `¥${val?.toLocaleString()}`,
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.park.asset.leaseStatus' }),
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: any) => {
                      const statusColors: Record<string, string> = {
                        Active: 'green',
                        Expired: 'default',
                        Renewed: 'cyan',
                        Terminated: 'red',
                      };
                      return <Tag color={statusColors[status] || 'blue'}>{status}</Tag>;
                    },
                  },
                ]}
                rowKey="id"
                pagination={false}
                search={false}
                toolBarRender={false}
              />
            </div>
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default PropertyManagement;
