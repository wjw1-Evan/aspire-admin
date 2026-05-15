import {
  DeleteOutlined,
  EditOutlined,
  PhoneOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import { App, Button, Col, Drawer, Flex, Input, Popconfirm, Progress, Row, Space, Tabs, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiResponse, PagedResult } from '@/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { ProCard, ProDescriptions, PageContainer, ActionType, ProColumns, ProTable, ModalForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components';


const { Text } = Typography;

interface InvestmentLead {
  id: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  industry?: string;
  source: string;
  intendedArea?: number;
  status: string;
  priority: string;
  assignedTo?: string;
  assignedToName?: string;
  nextFollowUpDate?: string;
  budget?: number;
  requirements?: string;
  createdAt: string;
}
interface InvestmentProject {
  id: string;
  leadId?: string;
  projectName: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  intendedArea?: number;
  proposedRent?: number;
  stage: string;
  expectedSignDate?: string;
  probability?: number;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
}
interface InvestmentStatistics {
  totalLeads: number;
  newLeadsThisMonth: number;
  totalProjects: number;
  projectsInNegotiation: number;
  signedProjects: number;
  conversionRate: number;
  leadsByStatus: Record<string, number>;
  projectsByStage: Record<string, number>;
}

const api = {
  getStatistics: () => request<ApiResponse<InvestmentStatistics>>('/apiservice/api/park/investment/statistics'),
  getLeads: (params: any) =>
    request<ApiResponse<PagedResult<InvestmentLead>>>('/apiservice/api/park/investment/leads/list', { params }),
  createLead: (data: Partial<InvestmentLead>) =>
    request<ApiResponse<InvestmentLead>>('/apiservice/api/park/investment/leads', { method: 'POST', data }),
  updateLead: (id: string, data: Partial<InvestmentLead>) =>
    request<ApiResponse<InvestmentLead>>(`/apiservice/api/park/investment/leads/${id}`, { method: 'PUT', data }),
  deleteLead: (id: string) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/investment/leads/${id}`, { method: 'DELETE' }),
  convertLeadToProject: (id: string) =>
    request<ApiResponse<InvestmentProject>>(`/apiservice/api/park/investment/leads/${id}/convert`, { method: 'POST' }),
  getProjects: (params: any) =>
    request<ApiResponse<PagedResult<InvestmentProject>>>('/apiservice/api/park/investment/projects/list', { params }),
  createProject: (data: Partial<InvestmentProject>) =>
    request<ApiResponse<InvestmentProject>>('/apiservice/api/park/investment/projects', { method: 'POST', data }),
  updateProject: (id: string, data: Partial<InvestmentProject>) =>
    request<ApiResponse<InvestmentProject>>(`/apiservice/api/park/investment/projects/${id}`, { method: 'PUT', data }),
  deleteProject: (id: string) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/investment/projects/${id}`, { method: 'DELETE' }),
};

const InvestmentManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const leadsActionRef = useRef<ActionType | undefined>(undefined);
  const projectsActionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as InvestmentStatistics | null,
    activeTab: 'leads',
    leadModalVisible: false,
    projectModalVisible: false,
    leadDetailVisible: false,
    projectDetailVisible: false,
    currentLead: null as InvestmentLead | null,
    currentProject: null as InvestmentProject | null,
    editingLead: null as InvestmentLead | null,
    editingProject: null as InvestmentProject | null,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState((prev) => ({ ...prev, ...partial })), []);

  useEffect(() => {
    api.getStatistics().then((r) => {
      if (r.success && r.data) set({ statistics: r.data });
    });
  }, [set]);
  useEffect(() => {
    if (state.activeTab === 'leads') leadsActionRef.current?.reload();
    else projectsActionRef.current?.reload();
  }, [state.activeTab]);

  const priorityOptions = useMemo(
    () => [
      { label: intl.formatMessage({ id: 'pages.park.investment.priority.high' }), value: 'High', color: 'red' },
      { label: intl.formatMessage({ id: 'pages.park.investment.priority.medium' }), value: 'Medium', color: 'orange' },
      { label: intl.formatMessage({ id: 'pages.park.investment.priority.low' }), value: 'Low', color: 'green' },
    ],
    [intl],
  );

  const leadStatusOptions = useMemo(
    () => [
      { label: intl.formatMessage({ id: 'pages.park.investment.status.new' }), value: 'New', color: 'blue' },
      {
        label: intl.formatMessage({ id: 'pages.park.investment.status.following' }),
        value: 'Following',
        color: 'processing',
      },
      { label: intl.formatMessage({ id: 'pages.park.investment.status.quoted' }), value: 'Quoted', color: 'orange' },
      {
        label: intl.formatMessage({ id: 'pages.park.investment.status.qualified' }),
        value: 'Qualified',
        color: 'green',
      },
      { label: intl.formatMessage({ id: 'pages.park.investment.status.lost' }), value: 'Lost', color: 'default' },
    ],
    [intl],
  );

  const projectStageOptions = useMemo(
    () => [
      { label: intl.formatMessage({ id: 'pages.park.investment.stage.initial' }), value: 'Initial', color: 'blue' },
      { label: intl.formatMessage({ id: 'pages.park.investment.stage.analysis' }), value: 'Analysis', color: 'cyan' },
      { label: intl.formatMessage({ id: 'pages.park.investment.stage.proposal' }), value: 'Proposal', color: 'orange' },
      {
        label: intl.formatMessage({ id: 'pages.park.investment.stage.negotiation' }),
        value: 'Negotiation',
        color: 'gold',
      },
      { label: intl.formatMessage({ id: 'pages.park.investment.stage.contract' }), value: 'Contract', color: 'lime' },
      {
        label: intl.formatMessage({ id: 'pages.park.investment.stage.completed' }),
        value: 'Completed',
        color: 'green',
      },
      {
        label: intl.formatMessage({ id: 'pages.park.investment.stage.cancelled' }),
        value: 'Cancelled',
        color: 'default',
      },
    ],
    [intl],
  );

  const sourceMap: Record<string, string> = useMemo(
    () => ({
      Direct: intl.formatMessage({ id: 'pages.park.investment.source.direct' }),
      Referral: intl.formatMessage({ id: 'pages.park.investment.source.referral' }),
      Exhibition: intl.formatMessage({ id: 'pages.park.investment.source.exhibition' }),
      Website: intl.formatMessage({ id: 'pages.park.investment.source.website' }),
      Other: intl.formatMessage({ id: 'pages.park.investment.source.other' }),
    }),
    [intl],
  );

  const sourceOptions = useMemo(
    () => [
      { label: intl.formatMessage({ id: 'pages.park.investment.source.direct' }), value: 'Direct' },
      { label: intl.formatMessage({ id: 'pages.park.investment.source.referral' }), value: 'Referral' },
      { label: intl.formatMessage({ id: 'pages.park.investment.source.exhibition' }), value: 'Exhibition' },
      { label: intl.formatMessage({ id: 'pages.park.investment.source.website' }), value: 'Website' },
      { label: intl.formatMessage({ id: 'pages.park.investment.source.other' }), value: 'Other' },
    ],
    [intl],
  );

  const handleRefresh = () => {
    api.getStatistics().then((r) => {
      if (r.success && r.data) set({ statistics: r.data });
    });
    if (state.activeTab === 'leads') leadsActionRef.current?.reload();
    else projectsActionRef.current?.reload();
  };
  const handleDeleteLead = async (id: string) => {
    const res = await api.deleteLead(id);
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.park.investment.message.deleteSuccess' }));
      leadsActionRef.current?.reload();
      handleRefresh();
    } else {
      message.error(getErrorMessage(res, 'pages.park.investment.message.deleteFailed'));
    }
  };
  const handleDeleteProject = async (id: string) => {
    const res = await api.deleteProject(id);
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.park.investment.message.deleteSuccess' }));
      projectsActionRef.current?.reload();
      handleRefresh();
    } else {
      message.error(getErrorMessage(res, 'pages.park.investment.message.deleteFailed'));
    }
  };
  const handleConvertToProject = async (leadId: string) => {
    const res = await api.convertLeadToProject(leadId);
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.park.investment.message.convertSuccess' }));
      set({ activeTab: 'projects' });
      leadsActionRef.current?.reload();
      projectsActionRef.current?.reload();
      handleRefresh();
    } else {
      message.error(getErrorMessage(res, 'pages.park.investment.message.convertFailed'));
    }
  };

  const leadColumns: ProColumns<InvestmentLead>[] = [
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.company' }),
      dataIndex: 'companyName',
      sorter: true,
      width: 180,
      render: (_, record) => (
        <Space>
          <TeamOutlined />
          <Text strong>
            {record.companyName}
          </Text>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.contact' }),
      dataIndex: 'contactPerson',
      sorter: true,
      width: 120,
      render: (text, record) => (
        <Flex vertical gap={0}>
          <Text>{text || '-'}</Text>
          {record.phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <PhoneOutlined /> {record.phone}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.industry' }),
      dataIndex: 'industry',
      sorter: true,
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.source' }),
      dataIndex: 'source',
      sorter: true,
      width: 100,
      render: (source) => <Tag>{sourceMap[source as string] || source}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.intendedArea' }),
      dataIndex: 'intendedArea',
      sorter: true,
      width: 100,
      align: 'right',
      render: (area) => (area ? `${area} m²` : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.priority' }),
      dataIndex: 'priority',
      sorter: true,
      width: 80,
      render: (priority) => {
        const opt = priorityOptions.find((o) => o.value === priority);
        return <Tag color={opt?.color || 'default'}>{opt?.label || priority}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.status' }),
      dataIndex: 'status',
      sorter: true,
      width: 100,
      render: (status) => {
        const opt = leadStatusOptions.find((o) => o.value === status);
        return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.lead.nextFollowUp' }),
      dataIndex: 'nextFollowUpDate',
      sorter: true,
      width: 110,
      render: (date) => (date ? dayjs(date as string).format('YYYY-MM-DD') : '-'),
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
            onClick={() => set({ editingLead: record, leadModalVisible: true })}
          >
            {intl.formatMessage({ id: 'common.edit' })}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SwapOutlined />}
            onClick={() => handleConvertToProject(record.id)}
            disabled={record.status === 'Lost' || record.status === 'Qualified'}
          >
            {intl.formatMessage({ id: 'pages.park.investment.convertToProject' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'common.confirmDelete' })}
            onConfirm={() => handleDeleteLead(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'common.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const projectColumns: ProColumns<InvestmentProject>[] = [
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.name' }),
      dataIndex: 'projectName',
      sorter: true,
      width: 200,
      render: (_, record) => (
        <Space>
          <ProjectOutlined />
          <Text strong>
            {record.projectName}
          </Text>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.company' }),
      dataIndex: 'companyName',
      sorter: true,
      width: 150,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.contact' }),
      dataIndex: 'contactPerson',
      sorter: true,
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.area' }),
      dataIndex: 'intendedArea',
      sorter: true,
      width: 100,
      align: 'right',
      render: (area) => (area ? `${area} m²` : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.rent' }),
      dataIndex: 'proposedRent',
      sorter: true,
      width: 120,
      align: 'right',
      render: (rent) => (rent ? `¥${rent?.toLocaleString()}/月` : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.stage' }),
      dataIndex: 'stage',
      sorter: true,
      width: 100,
      render: (stage) => {
        const opt = projectStageOptions.find((o) => o.value === stage);
        return <Tag color={opt?.color || 'default'}>{opt?.label || stage}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.probability' }),
      dataIndex: 'probability',
      sorter: true,
      width: 100,
      render: (prob) => (prob ? <Progress percent={prob as number} size="small" style={{ width: 80 }} /> : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.investment.project.expectedDate' }),
      dataIndex: 'expectedSignDate',
      sorter: true,
      width: 110,
      render: (date) => (date ? dayjs(date as string).format('YYYY-MM-DD') : '-'),
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
            onClick={() => set({ editingProject: record, projectModalVisible: true })}
          >
            {intl.formatMessage({ id: 'common.edit' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'common.confirmDelete' })}
            onConfirm={() => handleDeleteProject(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'common.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const leadsStatTags = useMemo(
    () => (
      <Space size={12}>
        <Tag color="blue">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.leads' })} {state.statistics?.totalLeads || 0}
        </Tag>
        <Tag color="cyan">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.newLeadsThisMonth' })}{' '}
          {state.statistics?.newLeadsThisMonth || 0}
        </Tag>
        <Tag color="green">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.projects' })}{' '}
          {state.statistics?.totalProjects || 0}
        </Tag>
        <Tag color="orange">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.inNegotiation' })}{' '}
          {state.statistics?.projectsInNegotiation || 0}
        </Tag>
        <Tag color="purple">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.conversionRate' })}{' '}
          {state.statistics?.conversionRate || 0}%
        </Tag>
      </Space>
    ),
    [intl, state.statistics],
  );

  const projectsStatTags = useMemo(
    () => (
      <Space size={12}>
        <Tag color="blue">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.leads' })} {state.statistics?.totalLeads || 0}
        </Tag>
        <Tag color="green">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.projects' })}{' '}
          {state.statistics?.totalProjects || 0}
        </Tag>
        <Tag color="orange">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.inNegotiation' })}{' '}
          {state.statistics?.projectsInNegotiation || 0}
        </Tag>
        <Tag color="purple">
          {intl.formatMessage({ id: 'pages.park.investment.statistics.conversionRate' })}{' '}
          {state.statistics?.conversionRate || 0}%
        </Tag>
      </Space>
    ),
    [intl, state.statistics],
  );

  return (
    <PageContainer>
      <ProCard>
        <Tabs
          activeKey={state.activeTab}
          onChange={(key) => set({ activeTab: key })}
          items={[
            {
              key: 'leads',
              label: (
                <Space>
                  <TeamOutlined />
                  {intl.formatMessage({ id: 'pages.park.investment.leads' })}
                </Space>
              ),
              children: (
                <ProTable<InvestmentLead>
                  actionRef={leadsActionRef}
                  headerTitle={
                    <Space size={24}>
                      <Space>
                        <TeamOutlined />
                        {intl.formatMessage({ id: 'pages.park.investment.leads' })}
                      </Space>
                      {leadsStatTags}
                    </Space>
                  }
                  request={async (params: any, sort: any, filter: any) => {
                    const res = await api.getLeads({ ...params, search: state.search, sort, filter });
                    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
                  }}
                  columns={leadColumns}
                  rowKey="id"
                  search={false}
                  toolBarRender={() => [
                    <Input.Search
                      key="search"
                      placeholder={intl.formatMessage({ id: 'pages.common.search' })}
                      allowClear
                      value={state.search}
                      onChange={(e) => set({ search: e.target.value })}
                      onSearch={(v) => {
                        set({ search: v });
                        leadsActionRef.current?.reload();
                      }}
                      style={{ width: 260, marginRight: 8 }}
                      prefix={<SearchOutlined />}
                    />,
                    <Button
                      key="add"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => set({ editingLead: null, leadModalVisible: true })}
                    >
                      {intl.formatMessage({ id: 'pages.park.investment.button.addLead' })}
                    </Button>,
                  ]}
                  scroll={{ x: 1400 }}
                  onRow={(record) => ({
                    onClick: () => set({ currentLead: record, leadDetailVisible: true }),
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'projects',
              label: (
                <Space>
                  <ProjectOutlined />
                  {intl.formatMessage({ id: 'pages.park.investment.projects' })}
                </Space>
              ),
              children: (
                <ProTable<InvestmentProject>
                  actionRef={projectsActionRef}
                  headerTitle={
                    <Space size={24}>
                      <Space>
                        <ProjectOutlined />
                        {intl.formatMessage({ id: 'pages.park.investment.projects' })}
                      </Space>
                      {projectsStatTags}
                    </Space>
                  }
                  request={async (params: any, sort: any, filter: any) => {
                    const res = await api.getProjects({ ...params, search: state.search, sort, filter });
                    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
                  }}
                  columns={projectColumns}
                  rowKey="id"
                  search={false}
                  toolBarRender={() => [
                    <Input.Search
                      key="search"
                      placeholder={intl.formatMessage({ id: 'pages.common.search' })}
                      allowClear
                      value={state.search}
                      onChange={(e) => set({ search: e.target.value })}
                      onSearch={(v) => {
                        set({ search: v });
                        projectsActionRef.current?.reload();
                      }}
                      style={{ width: 260, marginRight: 8 }}
                      prefix={<SearchOutlined />}
                    />,
                    <Button
                      key="add"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => set({ editingProject: null, projectModalVisible: true })}
                    >
                      {intl.formatMessage({ id: 'pages.park.investment.button.addProject' })}
                    </Button>,
                  ]}
                  scroll={{ x: 1300 }}
                  onRow={(record) => ({
                    onClick: () => set({ currentProject: record, projectDetailVisible: true }),
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
          ]}
        />
      </ProCard>

      <ModalForm
        key={state.editingLead?.id || 'create-lead'}
        title={
          state.editingLead
            ? intl.formatMessage({ id: 'pages.park.investment.editLead' })
            : intl.formatMessage({ id: 'pages.park.investment.addLead' })
        }
        open={state.leadModalVisible}
        onOpenChange={(open) => {
          if (!open) set({ leadModalVisible: false, editingLead: null });
        }}
        initialValues={
          state.editingLead
            ? {
                companyName: state.editingLead.companyName,
                industry: state.editingLead.industry,
                contactPerson: state.editingLead.contactPerson,
                phone: state.editingLead.phone,
                email: state.editingLead.email,
                source: state.editingLead.source ? [state.editingLead.source] : [],
                priority: state.editingLead.priority,
                intendedArea: state.editingLead.intendedArea,
                budget: state.editingLead.budget,
                nextFollowUpDate: state.editingLead.nextFollowUpDate
                  ? dayjs(state.editingLead.nextFollowUpDate)
                  : undefined,
                requirements: state.editingLead.requirements,
              }
            : undefined
        }
        onFinish={async (values) => {
          const nextFollowUpVal = values.nextFollowUpDate?.toISOString
            ? values.nextFollowUpDate.toISOString()
            : values.nextFollowUpDate;
          const data: Partial<InvestmentLead> = {
            ...values,
            source: Array.isArray(values.source) ? values.source[0] : values.source,
            nextFollowUpDate: nextFollowUpVal,
          };
          const res = state.editingLead ? await api.updateLead(state.editingLead.id, data) : await api.createLead(data);
          if (res.success) {
            message.success(
              intl.formatMessage({
                id: state.editingLead
                  ? 'pages.park.investment.message.updateSuccess'
                  : 'pages.park.investment.message.createSuccess',
              }),
            );
            set({ leadModalVisible: false, editingLead: null });
            leadsActionRef.current?.reload();
            handleRefresh();
          }
          return res.success;
        }}
        autoFocusFirstInput
        width={640}
      >
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              name="companyName"
              label={intl.formatMessage({ id: 'pages.park.investment.form.companyName' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.companyNamePlaceholder' })}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({ id: 'pages.park.investment.form.companyNamePlaceholder' }),
                },
              ]}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="industry"
              label={intl.formatMessage({ id: 'pages.park.investment.form.industry' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.industryPlaceholder' })}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <ProFormText
              name="contactPerson"
              label={intl.formatMessage({ id: 'pages.park.investment.form.contactPerson' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.contactPersonPlaceholder' })}
            />
          </Col>
          <Col span={8}>
            <ProFormText
              name="phone"
              label={intl.formatMessage({ id: 'pages.park.investment.form.phone' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.phonePlaceholder' })}
            />
          </Col>
          <Col span={8}>
            <ProFormText
              name="email"
              label={intl.formatMessage({ id: 'pages.park.investment.form.email' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.emailPlaceholder' })}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <ProFormSelect
              name="source"
              label={intl.formatMessage({ id: 'pages.park.investment.form.source' })}
              placeholder={intl.formatMessage({ id: 'common.search.placeholder' })}
              options={sourceOptions}
            />
          </Col>
          <Col span={8}>
            <ProFormSelect
              name="priority"
              label={intl.formatMessage({ id: 'pages.park.investment.form.priority' })}
              placeholder={intl.formatMessage({ id: 'common.search.placeholder' })}
              options={priorityOptions.map((o) => ({ label: o.label, value: o.value }))}
            />
          </Col>
          <Col span={8}>
            <ProFormDigit
              name="intendedArea"
              label={intl.formatMessage({ id: 'pages.park.investment.form.intendedArea' })}
              min={0}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.intendedAreaPlaceholder' })}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormDigit
              name="budget"
              label={intl.formatMessage({ id: 'pages.park.investment.form.budget' })}
              min={0}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.budgetPlaceholder' })}
            />
          </Col>
          <Col span={12}>
            <ProFormDatePicker
              name="nextFollowUpDate"
              label={intl.formatMessage({ id: 'pages.park.investment.form.nextFollowUpDate' })}
            />
          </Col>
        </Row>
        <ProFormTextArea
          name="requirements"
          label={intl.formatMessage({ id: 'pages.park.investment.form.requirements' })}
          placeholder={intl.formatMessage({ id: 'pages.park.investment.form.requirementsPlaceholder' })}
        />
      </ModalForm>

      <ModalForm
        key={state.editingProject?.id || 'create-project'}
        title={
          state.editingProject
            ? intl.formatMessage({ id: 'pages.park.investment.editProject' })
            : intl.formatMessage({ id: 'pages.park.investment.addProject' })
        }
        open={state.projectModalVisible}
        onOpenChange={(open) => {
          if (!open) set({ projectModalVisible: false, editingProject: null });
        }}
        initialValues={
          state.editingProject
            ? {
                projectName: state.editingProject.projectName,
                companyName: state.editingProject.companyName,
                contactPerson: state.editingProject.contactPerson,
                phone: state.editingProject.phone,
                intendedArea: state.editingProject.intendedArea,
                proposedRent: state.editingProject.proposedRent,
                probability: state.editingProject.probability,
                stage: state.editingProject.stage ? [state.editingProject.stage] : [],
                expectedSignDate: state.editingProject.expectedSignDate
                  ? dayjs(state.editingProject.expectedSignDate)
                  : undefined,
                notes: state.editingProject.notes,
              }
            : undefined
        }
        onFinish={async (values) => {
          const expectedSignVal = values.expectedSignDate?.toISOString
            ? values.expectedSignDate.toISOString()
            : values.expectedSignDate;
          const data: Partial<InvestmentProject> = {
            ...values,
            stage: Array.isArray(values.stage) ? values.stage[0] : values.stage,
            expectedSignDate: expectedSignVal,
          };
          const res = state.editingProject
            ? await api.updateProject(state.editingProject.id, data)
            : await api.createProject(data);
          if (res.success) {
            message.success(
              intl.formatMessage({
                id: state.editingProject
                  ? 'pages.park.investment.message.updateSuccess'
                  : 'pages.park.investment.message.createSuccess',
              }),
            );
            set({ projectModalVisible: false, editingProject: null });
            projectsActionRef.current?.reload();
            handleRefresh();
          }
          return res.success;
        }}
        autoFocusFirstInput
        width={640}
      >
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              name="projectName"
              label={intl.formatMessage({ id: 'pages.park.investment.form.projectName' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.projectNamePlaceholder' })}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({ id: 'pages.park.investment.form.projectNamePlaceholder' }),
                },
              ]}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="companyName"
              label={intl.formatMessage({ id: 'pages.park.investment.form.companyName' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.companyNamePlaceholder' })}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({ id: 'pages.park.investment.form.companyNamePlaceholder' }),
                },
              ]}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              name="contactPerson"
              label={intl.formatMessage({ id: 'pages.park.investment.form.contactPerson' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.contactPersonPlaceholder' })}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="phone"
              label={intl.formatMessage({ id: 'pages.park.investment.form.phone' })}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.phonePlaceholder' })}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <ProFormDigit
              name="intendedArea"
              label={intl.formatMessage({ id: 'pages.park.investment.form.intendedArea' })}
              min={0}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.intendedAreaPlaceholder' })}
            />
          </Col>
          <Col span={8}>
            <ProFormDigit
              name="proposedRent"
              label={intl.formatMessage({ id: 'pages.park.investment.form.proposedRent' })}
              min={0}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.proposedRentPlaceholder' })}
            />
          </Col>
          <Col span={8}>
            <ProFormDigit
              name="probability"
              label={intl.formatMessage({ id: 'pages.park.investment.form.probability' })}
              min={0}
              max={100}
              placeholder={intl.formatMessage({ id: 'pages.park.investment.form.probabilityPlaceholder' })}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="stage"
              label={intl.formatMessage({ id: 'pages.park.investment.form.stage' })}
              placeholder={intl.formatMessage({ id: 'common.search.placeholder' })}
              options={projectStageOptions.map((o) => ({ label: o.label, value: o.value }))}
            />
          </Col>
          <Col span={12}>
            <ProFormDatePicker
              name="expectedSignDate"
              label={intl.formatMessage({ id: 'pages.park.investment.form.expectedSignDate' })}
            />
          </Col>
        </Row>
        <ProFormTextArea
          name="notes"
          label={intl.formatMessage({ id: 'pages.park.investment.form.notes' })}
          placeholder={intl.formatMessage({ id: 'pages.park.investment.form.notesPlaceholder' })}
        />
      </ModalForm>

      <Drawer
        title={intl.formatMessage({ id: 'pages.park.investment.detail.lead' })}
        placement="right"
        size="large"
        open={state.leadDetailVisible}
        onClose={() => set({ leadDetailVisible: false, currentLead: null })}
      >
        {state.currentLead && (
          <ProDescriptions column={1} bordered size="small">
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.companyName' })}>
              {state.currentLead.companyName}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.industry' })}>
              {state.currentLead.industry || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.contactPerson' })}>
              {state.currentLead.contactPerson || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.phone' })}>
              {state.currentLead.phone || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.email' })}>
              {state.currentLead.email || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.source' })}>
              {sourceMap[state.currentLead.source] || state.currentLead.source}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.lead.intendedArea' })}>
              {state.currentLead.intendedArea ? `${state.currentLead.intendedArea} m²` : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.priority' })}>
              {(() => {
                const opt = priorityOptions.find((o) => o.value === state.currentLead?.priority);
                return <Tag color={opt?.color}>{opt?.label || state.currentLead?.priority}</Tag>;
              })()}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.detail.currentStatus' })}>
              {(() => {
                const opt = leadStatusOptions.find((o) => o.value === state.currentLead?.status);
                return <Tag color={opt?.color}>{opt?.label || state.currentLead?.status}</Tag>;
              })()}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.detail.nextFollowUpDate' })}>
              {state.currentLead.nextFollowUpDate
                ? dayjs(state.currentLead.nextFollowUpDate).format('YYYY-MM-DD')
                : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'common.createdAt' })}>
              {dayjs(state.currentLead.createdAt).format('YYYY-MM-DD HH:mm')}
            </ProDescriptions.Item>
          </ProDescriptions>
        )}
      </Drawer>

      <Drawer
        title={intl.formatMessage({ id: 'pages.park.investment.detail.project' })}
        placement="right"
        size="large"
        open={state.projectDetailVisible}
        onClose={() => set({ projectDetailVisible: false, currentProject: null })}
      >
        {state.currentProject && (
          <ProDescriptions column={1} bordered size="small">
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.projectName' })}>
              {state.currentProject.projectName}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.companyName' })}>
              {state.currentProject.companyName}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.contactPerson' })}>
              {state.currentProject.contactPerson || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.form.phone' })}>
              {state.currentProject.phone || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.lead.intendedArea' })}>
              {state.currentProject.intendedArea ? `${state.currentProject.intendedArea} m²` : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.project.rent' })}>
              {state.currentProject.proposedRent ? `¥${state.currentProject.proposedRent?.toLocaleString()}/月` : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.detail.currentStage' })}>
              {(() => {
                const opt = projectStageOptions.find((o) => o.value === state.currentProject?.stage);
                return <Tag color={opt?.color}>{opt?.label || state.currentProject?.stage}</Tag>;
              })()}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.project.probability' })}>
              <Progress percent={state.currentProject.probability as number} size="small" />
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.investment.detail.expectedSignDate' })}>
              {state.currentProject.expectedSignDate
                ? dayjs(state.currentProject.expectedSignDate).format('YYYY-MM-DD')
                : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'common.createdAt' })}>
              {dayjs(state.currentProject.createdAt).format('YYYY-MM-DD HH:mm')}
            </ProDescriptions.Item>
          </ProDescriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default InvestmentManagement;
