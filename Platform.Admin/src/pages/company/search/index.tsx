import {
  SearchOutlined,
  BankOutlined,
  TeamOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-layout';
import {
  Input,
  Card,
  List,
  Button,
  Tag,
  Space,
  Empty,
  Spin,
  App,
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
        message.error(response.errorMessage || intl.formatMessage({ id: 'pages.message.searchFailed' }));
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.message.searchFailed' }));
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
            message.error(response.errorMessage || intl.formatMessage({ id: 'pages.message.applicationFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.message.applicationFailed' }));
        } finally {
          setApplyingId('');
        }
      },
    });
  };

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'pages.company.search.title' }),
        subTitle: intl.formatMessage({ id: 'pages.company.search.subTitle' }),
      }}
    >
      <ProCard>
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
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 1,
              md: 2,
              lg: 2,
              xl: 3,
              xxl: 3,
            }}
            dataSource={searchResults}
            renderItem={(item) => (
              <List.Item>
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
                      <Space>
                        {item.company.name}
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
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: '#666' }}>{intl.formatMessage({ id: 'pages.table.companyCode' })}</span>
                          <span style={{ fontWeight: 500 }}>
                            {item.company.code}
                          </span>
                        </div>
                        {item.company.description && (
                          <div style={{ marginBottom: 8, color: '#666' }}>
                            {item.company.description}
                          </div>
                        )}
                        <div style={{ marginTop: 12 }}>
                          <Space>
                            <TeamOutlined />
                            <span>{intl.formatMessage({ id: 'pages.table.members' }, { count: item.memberCount })}</span>
                          </Space>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : keyword ? (
          <Empty description={intl.formatMessage({ id: 'pages.placeholder.noCompaniesFound' })} style={{ padding: 60 }} />
        ) : (
          <Empty
            description={intl.formatMessage({ id: 'pages.placeholder.pleaseSearchCompany' })}
            style={{ padding: 60 }}
          />
        )}
      </ProCard>
    </PageContainer>
  );
};

export default CompanySearch;
