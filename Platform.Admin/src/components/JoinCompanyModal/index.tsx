import { PlusOutlined, SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Space, App as AntApp, Tag, Divider, Typography, Flex } from 'antd';
import React, { useState, useMemo } from 'react';
import { useIntl } from '@umijs/max';
import { applyToJoinCompany, searchCompanies, leaveCompany, cancelJoinRequest } from '@/services/company';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { CompanySearchResult } from '@/types';

const { Text } = Typography;

const { TextArea } = Input;

interface JoinCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 加入企业申请模态框
 * 支持搜索企业和提交加入申请
 */
export const JoinCompanyModal: React.FC<JoinCompanyModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const intl = useIntl();
  const { message, modal } = AntApp.useApp();
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] =
    useState<CompanySearchResult | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // 重置状态
  const resetState = () => {
    setKeyword('');
    setSearchResults([]);
    setSelectedCompany(null);
    setReason('');
    setLoading(false);
    setSearching(false);
  };

  // 搜索企业
  const handleSearch = async () => {
    if (!keyword.trim()) {
      message.warning(intl.formatMessage({ id: 'pages.company.join.searchFailed' }));
      return;
    }

    setSearching(true);
    try {
      const response = await searchCompanies(keyword);

      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          message.info(intl.formatMessage({ id: 'pages.company.join.noResults' }));
        }
      } else {
        message.error(getErrorMessage(response, 'pages.company.searchFailed'));
        setSearchResults([]);
      }
    } catch (error: any) {
      // 搜索企业失败，由错误处理机制处理
      message.error(error.message || intl.formatMessage({ id: 'pages.company.searchFailed' }));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 选择企业
  const handleSelectCompany = (result: CompanySearchResult) => {
    // 检查是否已是成员或已有待审核申请
    if (result.isMember) {
      message.warning(intl.formatMessage({ id: 'pages.company.join.alreadyMember' }));
      return;
    }
    if (result.hasPendingRequest) {
      message.warning(intl.formatMessage({ id: 'pages.company.join.pendingRequest' }));
      return;
    }
    setSelectedCompany(result);
  };

  // 提交申请
  const handleApply = async () => {
    if (!selectedCompany) {
      message.warning(intl.formatMessage({ id: 'pages.company.join.selectCompany' }));
      return;
    }

    // 再次检查是否已是成员或已有待审核申请（防止状态变化）
    if (selectedCompany.isMember) {
      message.warning(intl.formatMessage({ id: 'pages.company.join.alreadyMember' }));
      return;
    }
    if (selectedCompany.hasPendingRequest) {
      message.warning(intl.formatMessage({ id: 'pages.company.join.pendingRequest' }));
      return;
    }

    if (!reason.trim()) {
      message.warning(intl.formatMessage({ id: 'pages.company.join.enterReason' }));
      return;
    }

    setLoading(true);
    try {
      const response = await applyToJoinCompany({
        companyId: selectedCompany.company?.id || '',
        reason: reason.trim(),
      });

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.company.join.submitSuccess' }));
        resetState();
        onClose();
        onSuccess?.();
      } else {
        message.error(getErrorMessage(response, 'pages.company.applyFailed'));
      }
    } catch (error: any) {
      // 提交申请失败，由错误处理机制处理
      message.error(error.message || intl.formatMessage({ id: 'pages.company.join.submitFailed' }));
    } finally {
      setLoading(false);
    }
  };

  // 退出企业
  const handleLeaveCompany = async (companyId: string, companyName: string) => {
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.company.join.confirmLeave' }),
      content: intl.formatMessage(
        { id: 'pages.company.join.leaveContent' },
        { companyName },
      ),
      onOk: async () => {
        try {
          const response = await leaveCompany(companyId);
          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.company.join.leaveSuccess' }));
            handleSearch(); // 刷新搜索结果
            onSuccess?.(); // 刷新全局状态
          }
        } catch (error) {
          // 错误由全局拦截器处理，此处仅需确保流程继续或停止
          console.error(error);
        }
      },
    });
  };

  // 撤销申请
  const handleCancelRequest = async (requestId: string) => {
    if (!requestId || requestId === 'undefined') {
      message.error(intl.formatMessage({ id: 'pages.company.join.requestIdError' }));
      return;
    }
    try {
      setLoading(true);
      const response = await cancelJoinRequest(requestId);
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.company.join.cancelSuccess' }));
        handleSearch(); // 刷新搜索结果
      }
    } catch (error) {
      // 错误由全局拦截器处理
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 关闭模态框
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 将搜索结果分为已加入和未加入两组
  const { joinedCompanies, availableCompanies } = useMemo(() => {
    const joined: CompanySearchResult[] = [];
    const available: CompanySearchResult[] = [];

    for (const item of searchResults) {
      if (item.isMember || item.hasPendingRequest) {
        joined.push(item);
      } else {
        available.push(item);
      }
    }


    return {
      joinedCompanies: joined,
      availableCompanies: available,
    };
  }, [searchResults]);

  return (
    <Modal
      title={intl.formatMessage({ id: 'pages.company.join.title' })}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        {/* 搜索框 */}
        <div>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder={intl.formatMessage({ id: 'pages.company.join.searchPlaceholder' })}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              size="large"
              prefix={<SearchOutlined />}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={searching}
              size="large"
            >
              {intl.formatMessage({ id: 'pages.company.join.search' })}
            </Button>
          </Space.Compact>
        </div>

        {/* 搜索结果列表 */}
        {searchResults.length > 0 && (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: 4,
            }}
          >
            {/* 已加入的企业 */}
            {joinedCompanies.length > 0 ? (
              <div>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f6ffed',
                    borderBottom: '1px solid #b7eb8f',
                  }}
                >
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text strong style={{ color: '#52c41a' }}>
                      {intl.formatMessage({ id: 'pages.company.join.joinedCompanies' })} ({joinedCompanies.length})
                    </Text>
                  </Space>
                </div>
                <div>
                  {joinedCompanies.map((item) => (
                    <div
                      key={item.company?.id}
                      style={{
                        padding: '12px 16px',
                        background: '#fafafa',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Space wrap>
                          <span style={{ fontWeight: 500, color: '#595959' }}>
                            {item.company?.name}
                          </span>
                          {item.isMember && (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
                              {intl.formatMessage({ id: 'pages.company.joined' })}
                            </Tag>
                          )}
                          {item.hasPendingRequest && !item.isMember && (
                            <Tag color="processing" style={{ margin: 0 }}>{intl.formatMessage({ id: 'pages.company.pendingReview' })}</Tag>
                          )}
                          {item.isCreator && (
                            <Tag color="gold" style={{ margin: 0 }}>{intl.formatMessage({ id: 'pages.company.myCompany' })}</Tag>
                          )}
                        </Space>
                        <Space orientation="vertical" size={0}>
                          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                            {intl.formatMessage({ id: 'pages.company.join.companyCode' })}: {item.company?.code}
                          </span>
                          {item.company?.description && (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              {item.company?.description}
                            </span>
                          )}
                          {(item.memberCount ?? 0) > 0 && (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              {intl.formatMessage({ id: 'pages.company.join.memberCount' })}: {item.memberCount}
                            </span>
                          )}
                          {item.creatorName && (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              {intl.formatMessage({ id: 'pages.company.join.creator' })}: {item.creatorName}
                            </span>
                          )}
                        </Space>
                      </Flex>
                      <Space>
                        {item.isMember ? (
                          <Button
                            danger
                            size="small"
                            disabled={item.isCreator}
                            title={item.isCreator ? intl.formatMessage({ id: 'pages.company.join.cannotLeave' }) : ''}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveCompany(item.company?.id!, item.company?.name || '');
                            }}
                          >
                            {intl.formatMessage({ id: 'pages.company.join.leaveCompany' })}
                          </Button>
                        ) : item.hasPendingRequest ? (
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelRequest(item.requestId!);
                            }}
                          >
                            {intl.formatMessage({ id: 'pages.company.join.cancelRequest' })}
                          </Button>
                        ) : null}
                      </Space>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 分隔线 */}
            {joinedCompanies.length > 0 && availableCompanies.length > 0 && (
              <Divider style={{ margin: 0 }} />
            )}

            {/* 可申请的企业 */}
            {availableCompanies.length > 0 ? (
              <div>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#e6f7ff',
                    borderBottom: '1px solid #91d5ff',
                  }}
                >
                  <Space>
                    <PlusOutlined style={{ color: '#1890ff' }} />
                    <Text strong style={{ color: '#1890ff' }}>
                      {intl.formatMessage({ id: 'pages.company.join.availableCompanies' })} ({availableCompanies.length})
                    </Text>
                  </Space>
                </div>
                <div>
                  {availableCompanies.map((item) => {
                    const isDisabled = item.isMember || item.hasPendingRequest;
                    const isSelected = selectedCompany?.company?.id === item.company?.id;

                    return (
                      <div
                        key={item.company?.id}
                        onClick={() => !isDisabled && handleSelectCompany(item)}
                        style={{
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          background: isSelected ? '#e6f7ff' : undefined,
                          padding: '12px 16px',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                        onMouseEnter={(e) => {
                          if (!isDisabled && !isSelected) {
                            e.currentTarget.style.background = '#f0f0f0';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = '';
                          }
                        }}
                      >
                        <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 500 }}>{item.company?.name}</span>
                          <Space orientation="vertical" size={0}>
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              {intl.formatMessage({ id: 'pages.company.join.companyCode' })}: {item.company?.code}
                            </span>
                            {item.company?.description && (
                              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {item.company?.description}
                              </span>
                            )}
                            {(item.memberCount ?? 0) > 0 && (
                              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {intl.formatMessage({ id: 'pages.company.join.memberCount' })}: {item.memberCount}
                              </span>
                            )}
                            {item.creatorName && (
                              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {intl.formatMessage({ id: 'pages.company.join.creator' })}: {item.creatorName}
                              </span>
                            )}
                          </Space>
                        </Flex>
                        <Space>
                          {isSelected && (
                            <Tag color="blue">{intl.formatMessage({ id: 'pages.company.join.selected' })}</Tag>
                          )}
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 申请理由 */}
        {selectedCompany && (
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>{intl.formatMessage({ id: 'pages.company.join.reasonLabel' })}</div>
            <TextArea
              rows={4}
              placeholder={intl.formatMessage({ id: 'pages.company.join.reasonPlaceholder' })}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              showCount
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>{intl.formatMessage({ id: 'pages.company.join.cancel' })}</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleApply}
            disabled={!selectedCompany || !reason.trim()}
            loading={loading}
          >
            {intl.formatMessage({ id: 'pages.company.join.submit' })}
          </Button>
        </div>
      </Space>
    </Modal>
  );
};
