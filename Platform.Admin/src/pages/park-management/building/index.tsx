import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import type { UploadFile } from 'antd';
import { App, Button, Col, Drawer, Input, Popconfirm, Row, Space, Tag, Typography, Upload } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiResponse, PagedResult } from '@/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { ProDescriptions, ModalForm, ProFormDatePicker, ProFormSelect, ProFormText, PageContainer, ActionType, ProColumns, ProTable } from '@ant-design/pro-components';


const { Text, Title } = Typography;

interface Building {
  id: string;
  name: string;
  address?: string;
  totalFloors: number;
  totalArea: number;
  rentedArea: number;
  occupancyRate: number;
  buildingType?: string;
  yearBuilt?: number;
  deliveryDate?: string;
  status: string;
  description?: string;
  coverImage?: string;
  totalUnits: number;
  availableUnits: number;
  createdAt: string;
  attachments?: string[];
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
  buildings: (params: any) =>
    request<ApiResponse<PagedResult<Building>>>('/apiservice/api/park/buildings/list', { params }),
  getBuilding: (id: string) => request<ApiResponse<Building>>(`/apiservice/api/park/buildings/${id}`),
  createBuilding: (data: Partial<Building>) =>
    request<ApiResponse<Building>>('/apiservice/api/park/buildings', { method: 'POST', data }),
  updateBuilding: (id: string, data: Partial<Building>) =>
    request<ApiResponse<Building>>(`/apiservice/api/park/buildings/${id}`, { method: 'PUT', data }),
  deleteBuilding: (id: string) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/buildings/${id}`, { method: 'DELETE' }),
};

const BuildingManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const buildingActionRef = useRef<ActionType | undefined>(undefined);

  const [statistics, setStatistics] = useState<AssetStatistics | null>(null);
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [attachments, setAttachments] = useState<UploadFile[]>([]);

  useEffect(() => {
    api.statistics().then((r) => {
      if (r.success && r.data) setStatistics(r.data);
    });
  }, []);

  const handleViewBuilding = async (id: string) => {
    setCurrentBuilding(null);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await api.getBuilding(id);
      if (res.success && res.data) {
        setCurrentBuilding(res.data);
      }
    } catch (error) {
      console.error('Failed to load building details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    const res = await api.deleteBuilding(id);
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.park.asset.deleteSuccess' }));
      buildingActionRef.current?.reload();
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

  const renderBuildingType = (buildingType?: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      Office: { color: 'blue', text: intl.formatMessage({ id: 'pages.park.asset.buildingType.office' }) },
      Commercial: { color: 'green', text: intl.formatMessage({ id: 'pages.park.asset.buildingType.commercial' }) },
      Mixed: { color: 'orange', text: intl.formatMessage({ id: 'pages.park.asset.buildingType.mixed' }) },
      Residential: { color: 'purple', text: intl.formatMessage({ id: 'pages.park.asset.buildingType.residential' }) },
    };
    const config = typeMap[buildingType || ''] || { color: 'default', text: buildingType || '' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const renderBuildingStatus = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      Active: { color: 'green', text: intl.formatMessage({ id: 'pages.park.asset.status.active' }) },
      Maintenance: { color: 'orange', text: intl.formatMessage({ id: 'pages.park.asset.status.maintenance' }) },
      Inactive: { color: 'default', text: intl.formatMessage({ id: 'pages.park.asset.status.inactive' }) },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const buildingColumns: ProColumns<Building>[] = [
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.name' }),
      dataIndex: 'name',
      sorter: true,
      width: 160,
      render: (_, record) => (
        <Space>
          <BankOutlined style={{ color: '#1890ff' }} />
          {record.name}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.address' }),
      dataIndex: 'address',
      sorter: true,
      width: 200,
      ellipsis: true,
      render: (_, record) => record.address || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.type' }),
      dataIndex: 'buildingType',
      sorter: true,
      width: 100,
      render: (_, record) => renderBuildingType(record.buildingType),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.floors' }),
      dataIndex: 'totalFloors',
      sorter: true,
      width: 80,
      align: 'center',
      render: (_, record) => `${record.totalFloors}${intl.formatMessage({ id: 'pages.park.asset.floorsSuffix' })}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.area' }),
      dataIndex: 'totalArea',
      sorter: true,
      width: 120,
      align: 'right',
      render: (_, record) => `${record.totalArea?.toLocaleString()} m²`,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.occupancy' }),
      dataIndex: 'occupancyRate',
      sorter: true,
      width: 120,
      render: (_, record) => (
        <Tag
          color={
            (record.occupancyRate || 0) >= 80
              ? 'success'
              : (record.occupancyRate || 0) >= 50
                ? 'processing'
                : 'exception'
          }
        >
          {record.occupancyRate || 0}%
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.units' }),
      dataIndex: 'totalUnits',
      sorter: true,
      width: 140,
      align: 'center',
      render: (totalUnits, record) => (
        <Space>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>{totalUnits}</span>
          <Text type="secondary">
            {intl.formatMessage({ id: 'pages.park.asset.available' })}: {record.availableUnits}
          </Text>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.asset.building.status' }),
      dataIndex: 'status',
      sorter: true,
      width: 100,
      render: (_, record) => renderBuildingStatus(record.status),
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
              setEditingBuilding(record);
              setModalVisible(true);
              setAttachments(mapAttachments(record.attachments));
            }}
          >
            {intl.formatMessage({ id: 'common.edit' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'common.confirmDelete' })}
            onConfirm={() => handleDeleteBuilding(record.id)}
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
      <ProTable<Building>
          actionRef={buildingActionRef}
          headerTitle={
            <Space size={24}>
              <Space>
                <BankOutlined />
                楼宇管理
              </Space>
              <Space size={12}>
                <Tag color="blue">{intl.formatMessage({ id: 'pages.park.asset.buildings' })} {statistics?.totalBuildings || 0}</Tag>
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
            const res = await api.buildings({ ...params, search, sort, filter });
            return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
          }}
          columns={buildingColumns}
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
                buildingActionRef.current?.reload();
              }}
              style={{ width: 260, marginRight: 8 }}
              prefix={<SearchOutlined />}
            />,
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingBuilding(null);
                setModalVisible(true);
                setAttachments([]);
              }}
            >
              {intl.formatMessage({ id: 'pages.park.asset.addBuilding' })}
            </Button>,
          ]}
          scroll={{ x: 1200 }}
          onRow={(record) => ({
            onClick: (e) => {
              const target = e.target as HTMLElement;
              if (target.closest('.ant-btn')) return;
              handleViewBuilding(record.id);
            },
            style: { cursor: 'pointer' },
          })}
        />

      <ModalForm
        key={editingBuilding?.id || 'create-building'}
        title={
          editingBuilding
            ? intl.formatMessage({ id: 'pages.park.asset.editBuilding' })
            : intl.formatMessage({ id: 'pages.park.asset.addBuilding' })
        }
        open={modalVisible}
        onOpenChange={(open) => {
          if (!open) {
            setModalVisible(false);
            setEditingBuilding(null);
          }
        }}
        initialValues={
          editingBuilding
            ? {
                name: editingBuilding.name,
                buildingType: editingBuilding.buildingType,
                address: editingBuilding.address,
                totalFloors: editingBuilding.totalFloors,
                totalArea: editingBuilding.totalArea,
                yearBuilt: editingBuilding.yearBuilt,
                deliveryDate: editingBuilding.deliveryDate ? dayjs(editingBuilding.deliveryDate) : undefined,
                status: editingBuilding.status,
                description: editingBuilding.description,
              }
            : undefined
        }
        onFinish={async (values) => {
          const deliveryDateVal = values.deliveryDate?.toISOString
            ? values.deliveryDate.toISOString()
            : values.deliveryDate;
          const data = {
            ...values,
            deliveryDate: deliveryDateVal,
            attachments: extractAttachmentUrls(attachments),
          };
          const res = editingBuilding
            ? await api.updateBuilding(editingBuilding.id, data)
            : await api.createBuilding(data);
          if (res.success) {
            setModalVisible(false);
            setEditingBuilding(null);
            buildingActionRef.current?.reload();
            api.statistics().then((r) => {
              if (r.success && r.data) setStatistics(r.data);
            });
          }
          return res.success;
        }}
        autoFocusFirstInput
        width={640}
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'pages.park.asset.buildingName' })}
          placeholder={intl.formatMessage({ id: 'pages.park.asset.buildingNamePlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.buildingNameRequired' }) }]}
        />
        <ProFormSelect
          name="buildingType"
          label={intl.formatMessage({ id: 'pages.park.asset.buildingType' })}
          placeholder={intl.formatMessage({ id: 'pages.park.asset.buildingTypePlaceholder' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.park.asset.buildingType.office' }), value: 'Office' },
            { label: intl.formatMessage({ id: 'pages.park.asset.buildingType.commercial' }), value: 'Commercial' },
            { label: intl.formatMessage({ id: 'pages.park.asset.buildingType.mixed' }), value: 'Mixed' },
            { label: intl.formatMessage({ id: 'pages.park.asset.buildingType.residential' }), value: 'Residential' },
          ]}
        />
        <ProFormText
          name="address"
          label={intl.formatMessage({ id: 'pages.park.asset.address' })}
          placeholder={intl.formatMessage({ id: 'pages.park.asset.addressPlaceholder' })}
        />
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              name="totalFloors"
              label={intl.formatMessage({ id: 'pages.park.asset.totalFloors' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.totalFloorsPlaceholder' })}
              rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.totalFloorsRequired' }) }]}
              fieldProps={{ type: 'number' }}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="totalArea"
              label={intl.formatMessage({ id: 'pages.park.asset.totalArea' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.totalAreaPlaceholder' })}
              rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.asset.totalAreaRequired' }) }]}
              fieldProps={{ type: 'number' }}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <ProFormText
              name="yearBuilt"
              label={intl.formatMessage({ id: 'pages.park.asset.yearBuilt' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.yearBuiltPlaceholder' })}
              fieldProps={{ type: 'number' }}
            />
          </Col>
          <Col span={8}>
            <ProFormDatePicker
              name="deliveryDate"
              label={intl.formatMessage({ id: 'pages.park.asset.deliveryDate' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.deliveryDatePlaceholder' })}
            />
          </Col>
          <Col span={8}>
            <ProFormSelect
              name="status"
              label={intl.formatMessage({ id: 'pages.park.asset.status' })}
              placeholder={intl.formatMessage({ id: 'pages.park.asset.statusPlaceholder' })}
              options={[
                { label: intl.formatMessage({ id: 'pages.park.asset.status.active' }), value: 'Active' },
                { label: intl.formatMessage({ id: 'pages.park.asset.status.maintenance' }), value: 'Maintenance' },
                { label: intl.formatMessage({ id: 'pages.park.asset.status.inactive' }), value: 'Inactive' },
              ]}
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
            data={(file) => ({ file, isPublic: false, description: 'Building Attachment' })}
          >
            <Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.park.asset.uploadAttachment' })}</Button>
          </Upload>
        </div>
      </ModalForm>

      <Drawer
        title={currentBuilding?.name || intl.formatMessage({ id: 'pages.park.asset.buildingDetail' })}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setCurrentBuilding(null);
        }}
        size="large"
        loading={detailLoading}
      >
        {currentBuilding && (
          <div>
            <ProDescriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.buildingName' })}>
                {currentBuilding.name}
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.buildingType' })}>
                <Tag color="blue">
                  {intl.formatMessage({
                    id: `pages.park.asset.buildingType.${currentBuilding.buildingType?.toLowerCase()}`,
                  })}
                </Tag>
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.address' })}>
                {currentBuilding.address || '-'}
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.totalFloors' })}>
                {currentBuilding.totalFloors}
                {intl.formatMessage({ id: 'pages.park.asset.floorsSuffix' })}
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.yearBuilt' })}>
                {currentBuilding.yearBuilt || '-'}
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.deliveryDate' })}>
                {currentBuilding.deliveryDate ? dayjs(currentBuilding.deliveryDate).format('YYYY-MM-DD') : '-'}
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.totalArea' })}>
                {currentBuilding.totalArea?.toLocaleString()} m²
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.rentedArea' })}>
                {currentBuilding.rentedArea?.toLocaleString()} m²
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.occupancyRate' })}>
                <Tag
                  color={
                    (currentBuilding.occupancyRate || 0) >= 80
                      ? 'green'
                      : (currentBuilding.occupancyRate || 0) >= 50
                        ? 'orange'
                        : 'red'
                  }
                >
                  {currentBuilding.occupancyRate || 0}%
                </Tag>
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.totalUnits' })}>
                {currentBuilding.totalUnits}
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.availableUnits' })}>
                {currentBuilding.availableUnits}
              </ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.asset.detail.field.status' })}>
                <Tag color={currentBuilding.status === 'Active' ? 'green' : 'orange'}>
                  {intl.formatMessage({
                    id: `pages.park.asset.status.${currentBuilding.status === 'Active' ? 'active' : 'maintenance'}`,
                  })}
                </Tag>
              </ProDescriptions.Item>
            </ProDescriptions>
            {currentBuilding.description && (
              <div>
                <Title level={5}>{intl.formatMessage({ id: 'pages.park.asset.descriptionTitle' })}</Title>
                <Text>{currentBuilding.description}</Text>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default BuildingManagement;
