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
import { searchCompanies, applyToJoinCompany } from '@/services/company';

const { TextArea } = Input;

/**
 * v3.1: 企业搜索页面
 * 用户可以搜索企业并申请加入
 */
const CompanySearch: React.FC = () => {
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
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    try {
      const response = await searchCompanies(keyword.trim());

      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          message.info('未找到匹配的企业');
        }
      } else {
        message.error(response.errorMessage || '搜索失败');
      }
    } catch (error: any) {
      message.error(error.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 申请加入企业
  const handleApply = (company: API.Company) => {
    let reason = '';

    modal.confirm({
      title: `申请加入：${company.name}`,
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>请说明您的申请理由（可选）：</div>
          <TextArea
            rows={4}
            placeholder="例如：我想加入贵公司的开发团队..."
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: '提交申请',
      cancelText: '取消',
      onOk: async () => {
        setApplyingId(company.id || '');
        try {
          const response = await applyToJoinCompany({
            companyId: company.id || '',
            reason: reason || undefined,
          });

          if (response.success) {
            message.success('申请已提交，请等待企业管理员审核');
            // 刷新搜索结果
            await handleSearch();
          } else {
            message.error(response.errorMessage || '申请失败');
          }
        } catch (error: any) {
          message.error(error.message || '申请失败');
        } finally {
          setApplyingId('');
        }
      },
    });
  };

  return (
    <PageContainer
      header={{
        title: '搜索企业',
        subTitle: '搜索并申请加入其他企业',
      }}
    >
      <ProCard>
        {/* 搜索框 */}
        <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
          <Input
            size="large"
            placeholder="输入企业名称或代码搜索..."
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
            搜索
          </Button>
        </Space.Compact>

        {/* 搜索结果 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" tip="搜索中..." />
          </div>
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
                        <CheckCircleOutlined /> 已加入
                      </Button>
                    ) : item.hasPendingRequest ? (
                      <Button key="pending" type="text" disabled>
                        审核中...
                      </Button>
                    ) : (
                      <Button
                        key="apply"
                        type="primary"
                        onClick={() => handleApply(item.company)}
                        loading={applyingId === item.company.id}
                      >
                        申请加入
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
                              ? '已加入'
                              : '待激活'}
                          </Tag>
                        )}
                        {item.hasPendingRequest && (
                          <Tag color="processing">审核中</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: '#666' }}>企业代码：</span>
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
                            <span>{item.memberCount} 名成员</span>
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
          <Empty description="未找到匹配的企业" style={{ padding: 60 }} />
        ) : (
          <Empty
            description="请输入企业名称或代码进行搜索"
            style={{ padding: 60 }}
          />
        )}
      </ProCard>
    </PageContainer>
  );
};

export default CompanySearch;
