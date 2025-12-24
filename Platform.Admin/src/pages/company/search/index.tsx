import {
  SearchOutlined,
  BankOutlined,
  TeamOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@/components';
import {
  Input,
  Card,
  Button,
  Tag,
  Space,
  Empty,
  Spin,
  App,
  Row,
  Col,
} from 'antd';
import React, { useState } from 'react';
import { useIntl } from '@umijs/max';
import { searchCompanies, applyToJoinCompany } from '@/services/company';

const { TextArea } = Input;

/**
 * v3.1: 企业搜索页面
 * 用户可以搜索企业并申请加入
 */
const CompanySearch: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<API.CompanySearchResult[]>(
    [],
  );
  const [applyingId, setApplyingId] = useState<string>('');

  // 搜索企业
  const handleSearch = async () => {
    if (!keyword.trim()) {
      message.warning(intl.formatMessage({ id: 'pages.message.pleaseEnterKeyword' }));
      return;
    }

    setLoading(true);
    try {
      const response = await searchCompanies(keyword.trim());

      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          message.info(intl.formatMessage({ id: 'pages.placeholder.noCompaniesFound' }));
        }
      } else {
        // 失败时抛出错误，由全局错误处理统一处理
        throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.message.searchFailed' }));
      }
      // 错误由全局错误处理统一处理，这里不需要 catch
    } finally {
      setLoading(false);
    }
  };

  // 申请加入企业
  const handleApply = (company: API.Company) => {
    let reason = '';

    modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.applyToJoin' }, { companyName: company.name }),
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>{intl.formatMessage({ id: 'pages.modal.applyReasonLabel' })}</div>
          <TextArea
            rows={4}
            placeholder={intl.formatMessage({ id: 'pages.modal.applyReasonPlaceholder' })}
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.okSubmit' }),
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      onOk: async () => {
        setApplyingId(company.id || '');
        try {
          const response = await applyToJoinCompany({
            companyId: company.id || '',
            reason: reason || undefined,
          });

          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.message.applicationSubmitted' }));
            // 刷新搜索结果
            await handleSearch();
          } else {
            // 失败时抛出错误，由全局错误处理统一处理
            throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.message.applicationFailed' }));
          }
        } catch (error) {
          // 错误已被全局错误处理捕获并显示
          // 重新抛出以确保 Modal.confirm 在错误时不关闭（Ant Design 默认行为）
          throw error;
        } finally {
          setApplyingId('');
        }
      },
    });
  };

  return (
    <PageContainer
      title={
        <Space>
          <SearchOutlined />
          {intl.formatMessage({ id: 'pages.company.search.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
    >
      <Card>
        {/* 搜索框 */}
        <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
          <Input
            size="large"
            placeholder={intl.formatMessage({ id: 'pages.placeholder.searchCompany' })}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button
            type="primary"
            size="large"
            onClick={handleSearch}
            loading={loading}
          >
            {intl.formatMessage({ id: 'pages.button.search' })}
          </Button>
        </Space.Compact>

        {/* 搜索结果 */}
        {loading ? (
          <Spin
            size="large"
            tip={intl.formatMessage({ id: 'pages.message.searching' })}
            style={{ display: 'block', padding: 60, textAlign: 'center' }}
          >
            <div style={{ minHeight: 200 }} />
          </Spin>
        ) : searchResults.length > 0 ? (
          <Row gutter={[16, 16]}>
            {searchResults.map((item) => (
              <Col key={item.company.id} xs={24} sm={24} md={12} lg={12} xl={8} xxl={8}>
                <Card
                  hoverable
                  actions={[
                    item.isMember ? (
                      <Button key="joined" type="text" disabled>
                        <CheckCircleOutlined /> {intl.formatMessage({ id: 'pages.status.joined' })}
                      </Button>
                    ) : item.hasPendingRequest ? (
                      <Button key="pending" type="text" disabled>
                        {intl.formatMessage({ id: 'pages.status.pending' })}...
                      </Button>
                    ) : (
                      <Button
                        key="apply"
                        type="primary"
                        onClick={() => handleApply(item.company)}
                        loading={applyingId === item.company.id}
                      >
                        {intl.formatMessage({ id: 'pages.button.add' })}
                      </Button>
                    ),
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <BankOutlined
                        style={{ fontSize: 32, color: '#1890ff' }}
                      />
                    }
                    title={
                      <Space wrap>
                        <span>{item.company.name || intl.formatMessage({ id: 'pages.table.unknownCompany' })}</span>
                        {item.isMember && (
                          <Tag color="success">
                            {item.memberStatus === 'active'
                              ? intl.formatMessage({ id: 'pages.status.joined' })
                              : intl.formatMessage({ id: 'pages.status.pendingActivation' })}
                          </Tag>
                        )}
                        {item.hasPendingRequest && (
                          <Tag color="processing">{intl.formatMessage({ id: 'pages.status.pending' })}</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        {item.company.code && (
                          <div style={{ marginBottom: 8 }}>
                            <span style={{ color: '#666' }}>{intl.formatMessage({ id: 'pages.table.companyCode' })}: </span>
                            <span style={{ fontWeight: 500 }}>
                              {item.company.code}
                            </span>
                          </div>
                        )}
                        {item.company.description && (
                          <div style={{ marginBottom: 8, color: '#666', fontSize: '14px' }}>
                            {item.company.description}
                          </div>
                        )}
                        {item.company.industry && (
                          <div style={{ marginBottom: 8 }}>
                            <span style={{ color: '#666' }}>{intl.formatMessage({ id: 'pages.table.industry' })}: </span>
                            <span>{item.company.industry}</span>
                          </div>
                        )}
                        <div style={{ marginTop: 12 }}>
                          <Space>
                            <TeamOutlined />
                            <span>{intl.formatMessage({ id: 'pages.table.members' }, { count: item.memberCount ?? 0 })}</span>
                          </Space>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        ) : keyword ? (
          <Empty description={intl.formatMessage({ id: 'pages.placeholder.noCompaniesFound' })} style={{ padding: 60 }} />
        ) : (
          <Empty
            description={intl.formatMessage({ id: 'pages.placeholder.pleaseSearchCompany' })}
            style={{ padding: 60 }}
          />
        )}
      </Card>
    </PageContainer>
  );
};

export default CompanySearch;
