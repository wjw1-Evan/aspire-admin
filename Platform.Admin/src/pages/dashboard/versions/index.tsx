import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from '@umijs/max';
import { request, useIntl } from '@umijs/max';
import { Table, Tag, Space, Button, Modal, Descriptions, Typography, Alert, Popconfirm, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HistoryOutlined, RollbackOutlined, DeleteOutlined, SwapOutlined, InfoCircleOutlined, PlusOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ApiResponse, PagedResult } from '@/types';
import type { DashboardVersion, DashboardVersionComparison, DashboardVersionStatistics } from '@/services/dashboard-version/api';
import api from '@/services/dashboard-version/api';
import { useMessage } from '@/hooks/useMessage';

const { Text, Paragraph } = Typography;

const DashboardVersionPage: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const navigate = useNavigate();
  const { dashboardId } = useParams<{ dashboardId: string }>();

  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statistics, setStatistics] = useState<DashboardVersionStatistics | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 详情模态框
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<DashboardVersion | null>(null);

  // 比较模态框
  const [compareVisible, setCompareVisible] = useState(false);
  const [compareResult, setCompareResult] = useState<DashboardVersionComparison | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // 加载版本列表
  const loadVersions = useCallback(async (page = 1, pageSize = 10) => {
    if (!dashboardId) return;
    setLoading(true);
    try {
      const res = await api.list(dashboardId, { current: page, pageSize });
      if (res.success && res.data) {
        setVersions(res.data.queryable || []);
        setPagination({
          current: res.data.currentPage,
          pageSize: res.data.pageSize,
          total: res.data.rowCount,
        });
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.version.loadFailed' }));
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  // 加载统计信息
  const loadStatistics = useCallback(async () => {
    if (!dashboardId) return;
    try {
      const res = await api.statistics(dashboardId);
      if (res.success && res.data) {
        setStatistics(res.data);
      }
    } catch (error) {
      console.error('加载统计信息失败', error);
    }
  }, [dashboardId]);

  useEffect(() => {
    if (dashboardId) {
      loadVersions();
      loadStatistics();
    }
  }, [dashboardId, loadVersions, loadStatistics]);

  // 创建版本
  const handleCreateVersion = async () => {
    if (!dashboardId) return;
    try {
      const res = await api.create(dashboardId, { comment: `手动创建快照 - ${new Date().toLocaleString()}` });
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.version.createSuccess' }));
        loadVersions();
        loadStatistics();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || intl.formatMessage({ id: 'pages.dashboard.version.createFailed' }));
    }
  };

  // 恢复版本
  const handleRestore = async (versionNumber: number) => {
    if (!dashboardId) return;
    try {
      const res = await api.restore(dashboardId, versionNumber);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.version.restoreSuccess' }));
        loadVersions();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || intl.formatMessage({ id: 'pages.dashboard.version.restoreFailed' }));
    }
  };

  // 删除版本
  const handleDelete = async (versionId: string) => {
    try {
      const res = await api.delete(versionId);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.version.deleteSuccess' }));
        loadVersions();
        loadStatistics();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || intl.formatMessage({ id: 'pages.dashboard.version.deleteFailed' }));
    }
  };

  // 查看详情
  const handleViewDetail = async (versionId: string) => {
    try {
      const res = await api.get(versionId);
      if (res.success && res.data) {
        setViewingVersion(res.data);
        setDetailVisible(true);
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.version.loadFailed' }));
    }
  };

  // 比较版本
  const handleCompare = async () => {
    if (selectedRowKeys.length !== 2) {
      message.warning(intl.formatMessage({ id: 'pages.dashboard.version.selectTwoVersions' }));
      return;
    }

    setCompareLoading(true);
    try {
      const res = await api.compare(selectedRowKeys[0] as string, selectedRowKeys[1] as string);
      if (res.success && res.data) {
        setCompareResult(res.data);
        setCompareVisible(true);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || intl.formatMessage({ id: 'pages.dashboard.version.compareFailed' }));
    } finally {
      setCompareLoading(false);
    }
  };

  // 返回看板列表
  const handleBack = () => {
    navigate('/dashboard');
  };

  const columns: ColumnsType<DashboardVersion> = [
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.versionNumber' }),
      dataIndex: 'versionNumber',
      key: 'versionNumber',
      width: 100,
      sorter: true,
      render: (versionNumber, record) => (
        <Space>
          <Text strong>{versionNumber}</Text>
          {record.isCurrentVersion && (
            <Tag color="green">{intl.formatMessage({ id: 'pages.dashboard.version.currentVersion' })}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.name' }),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.layoutType' }),
      dataIndex: 'layoutType',
      key: 'layoutType',
      width: 120,
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.theme' }),
      dataIndex: 'theme',
      key: 'theme',
      width: 100,
      render: (text) => <Tag color={text === 'dark' ? 'blue' : 'default'}>{text}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.comment' }),
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.changedBy' }),
      dataIndex: 'changedBy',
      key: 'changedBy',
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      render: (text) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.version.action' }),
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            {intl.formatMessage({ id: 'pages.dashboard.version.view' })}
          </Button>
          {!record.isCurrentVersion && (
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.dashboard.version.confirmRestore' })}
              onConfirm={() => handleRestore(record.versionNumber)}
            >
              <Button type="link" size="small" icon={<RollbackOutlined />}>
                {intl.formatMessage({ id: 'pages.dashboard.version.restore' })}
              </Button>
            </Popconfirm>
          )}
          {!record.isCurrentVersion && (
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.dashboard.version.confirmDelete' })}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                {intl.formatMessage({ id: 'pages.dashboard.version.delete' })}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={handleBack}>
            {intl.formatMessage({ id: 'pages.dashboard.version.back' })}
          </Button>
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>
            <HistoryOutlined /> {intl.formatMessage({ id: 'pages.dashboard.version.title' })}
          </span>
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateVersion}
          >
            {intl.formatMessage({ id: 'pages.dashboard.version.create' })}
          </Button>
          <Button
            icon={<SwapOutlined />}
            disabled={selectedRowKeys.length !== 2}
            loading={compareLoading}
            onClick={handleCompare}
          >
            {intl.formatMessage({ id: 'pages.dashboard.version.compare' })}
          </Button>
        </Space>
      </div>

      {statistics && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Space size={24}>
              <span>
                <BarChartOutlined /> {intl.formatMessage({ id: 'pages.dashboard.version.totalVersions' })}: <Text strong>{statistics.totalVersions}</Text>
              </span>
              <span>
                {intl.formatMessage({ id: 'pages.dashboard.version.currentVersion' })}: <Text strong>{statistics.currentVersionNumber}</Text>
              </span>
            </Space>
          }
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={versions}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          type: 'checkbox',
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => intl.formatMessage({ id: 'pages.common.totalItems' }, { total }),
          onChange: (page, pageSize) => loadVersions(page, pageSize),
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 详情模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'pages.dashboard.version.detail' })}
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setViewingVersion(null); }}
        footer={null}
        width={700}
      >
        {viewingVersion && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.versionNumber' })} span={2}>
              <Space>
                <Text strong>{viewingVersion.versionNumber}</Text>
                {viewingVersion.isCurrentVersion && (
                  <Tag color="green">{intl.formatMessage({ id: 'pages.dashboard.version.currentVersion' })}</Tag>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.name' })} span={2}>
              {viewingVersion.name}
            </Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.layoutType' })}>
              <Tag>{viewingVersion.layoutType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.theme' })}>
              <Tag color={viewingVersion.theme === 'dark' ? 'blue' : 'default'}>{viewingVersion.theme}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.comment' })} span={2}>
              {viewingVersion.comment || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.changedBy' })}>
              {viewingVersion.changedBy}
            </Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.createdAt' })}>
              {viewingVersion.createdAt ? new Date(viewingVersion.createdAt).toLocaleString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.version.cardsSnapshot' })} span={2}>
              <Paragraph
                ellipsis={{ rows: 6, expandable: true }}
                style={{ maxHeight: 200, overflow: 'auto' }}
              >
                <pre style={{ margin: 0, fontSize: 12 }}>{viewingVersion.cardsSnapshot}</pre>
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 比较模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'pages.dashboard.version.compareResult' })}
        open={compareVisible}
        onCancel={() => { setCompareVisible(false); setCompareResult(null); }}
        footer={null}
        width={900}
      >
        {compareResult && (
          <div>
            <Alert
              type={compareResult.hasDifferences ? 'warning' : 'success'}
              message={
                compareResult.hasDifferences
                  ? intl.formatMessage({ id: 'pages.dashboard.version.hasDifferences' })
                  : intl.formatMessage({ id: 'pages.dashboard.version.noDifferences' })
              }
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <h4>{intl.formatMessage({ id: 'pages.dashboard.version.version1' })}: #{compareResult.version1?.versionNumber}</h4>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Name">{compareResult.version1?.name}</Descriptions.Item>
                  <Descriptions.Item label="Layout">{compareResult.version1?.layoutType}</Descriptions.Item>
                  <Descriptions.Item label="Theme">{compareResult.version1?.theme}</Descriptions.Item>
                </Descriptions>
              </div>
              <div style={{ flex: 1 }}>
                <h4>{intl.formatMessage({ id: 'pages.dashboard.version.version2' })}: #{compareResult.version2?.versionNumber}</h4>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Name">{compareResult.version2?.name}</Descriptions.Item>
                  <Descriptions.Item label="Layout">{compareResult.version2?.layoutType}</Descriptions.Item>
                  <Descriptions.Item label="Theme">{compareResult.version2?.theme}</Descriptions.Item>
                </Descriptions>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardVersionPage;
