import { PlusOutlined, SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Space, App as AntApp, Tag, Divider, Typography, Flex } from 'antd';
import React, { useState, useMemo } from 'react';
import { applyToJoinCompany, searchCompanies, leaveCompany, cancelJoinRequest } from '@/services/company';

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
  const { message, modal } = AntApp.useApp();
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<API.CompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] =
    useState<API.CompanySearchResult | null>(null);
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
      message.warning('请输入企业名称或代码');
      return;
    }

    setSearching(true);
    try {
      const response = await searchCompanies(keyword);

      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          message.info('未找到匹配的企业');
        }
      } else {
        message.error(response.errorMessage || '搜索失败');
        setSearchResults([]);
      }
    } catch (error: any) {
      // 搜索企业失败，由错误处理机制处理
      message.error(error.message || '搜索企业失败');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 选择企业
  const handleSelectCompany = (result: API.CompanySearchResult) => {
    // 检查是否已是成员或已有待审核申请
    if (result.isMember) {
      message.warning('您已是该企业的成员');
      return;
    }
    if (result.hasPendingRequest) {
      message.warning('您已提交过申请，请等待审核');
      return;
    }
    setSelectedCompany(result);
  };

  // 提交申请
  const handleApply = async () => {
    if (!selectedCompany) {
      message.warning('请选择要加入的企业');
      return;
    }

    // 再次检查是否已是成员或已有待审核申请（防止状态变化）
    if (selectedCompany.isMember) {
      message.warning('您已是该企业的成员');
      return;
    }
    if (selectedCompany.hasPendingRequest) {
      message.warning('您已提交过申请，请等待审核');
      return;
    }

    if (!reason.trim()) {
      message.warning('请输入申请理由');
      return;
    }

    setLoading(true);
    try {
      const response = await applyToJoinCompany({
        companyId: selectedCompany.company.id || '',
        reason: reason.trim(),
      });

      if (response.success) {
        message.success('申请已提交，请等待企业管理员审核');
        resetState();
        onClose();
        onSuccess?.();
      } else {
        message.error(response.errorMessage || '申请提交失败');
      }
    } catch (error: any) {
      // 提交申请失败，由错误处理机制处理
      message.error(error.message || '申请提交失败');
    } finally {
      setLoading(false);
    }
  };

  // 退出企业
  const handleLeaveCompany = async (companyId: string, companyName: string) => {
    modal.confirm({
      title: '确认退出企业',
      content: `确定要退出企业“${companyName}”吗？退出后您将失去该企业的访问权限。`,
      onOk: async () => {
        try {
          const response = await leaveCompany(companyId);
          if (response.success) {
            message.success('已成功退出企业');
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
      message.error('申请 ID 异常，请刷新页面重试');
      return;
    }
    try {
      setLoading(true);
      const response = await cancelJoinRequest(requestId);
      if (response.success) {
        message.success('申请已撤销');
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
    const joined: API.CompanySearchResult[] = [];
    const available: API.CompanySearchResult[] = [];

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
      title="加入企业"
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
              placeholder="搜索企业名称或代码"
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
              搜索
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
                      已加入的企业 ({joinedCompanies.length})
                    </Text>
                  </Space>
                </div>
                <div>
                  {joinedCompanies.map((item) => (
                    <div
                      key={item.company.id}
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
                            {item.company.name}
                          </span>
                          {item.isMember && (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
                              已加入
                            </Tag>
                          )}
                          {item.hasPendingRequest && !item.isMember && (
                            <Tag color="processing" style={{ margin: 0 }}>待审核</Tag>
                          )}
                          {item.isCreator && (
                            <Tag color="gold" style={{ margin: 0 }}>我的企业</Tag>
                          )}
                        </Space>
                        <Space orientation="vertical" size={0}>
                          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                            企业代码: {item.company.code}
                          </span>
                          {item.company.description && (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              {item.company.description}
                            </span>
                          )}
                          {item.memberCount > 0 && (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              成员数: {item.memberCount}
                            </span>
                          )}
                          {item.creatorName && (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              创建人: {item.creatorName}
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
                            title={item.isCreator ? "您是该企业的创建者，不能退出" : ""}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveCompany(item.company.id!, item.company.name);
                            }}
                          >
                            退出企业
                          </Button>
                        ) : item.hasPendingRequest ? (
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              // 注意：我们需要 requestId。CompanySearchResult 应该包含 requestId。
                              // 如果没有，我们需要修改后端 SearchCompaniesAsync 以返回它，或者前端通过 my-join-requests 匹配。
                              // 查看 searchCompanies 返回类型... API.CompanySearchResult。
                              // 我去查一下 CompanySearchResult 模型。
                              handleCancelRequest(item.requestId!);
                            }}
                          >
                            撤销申请
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
                      可申请的企业 ({availableCompanies.length})
                    </Text>
                  </Space>
                </div>
                <div>
                  {availableCompanies.map((item) => {
                    const isDisabled = item.isMember || item.hasPendingRequest;
                    const isSelected = selectedCompany?.company.id === item.company.id;

                    return (
                      <div
                        key={item.company.id}
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
                          <span style={{ fontWeight: 500 }}>{item.company.name}</span>
                          <Space orientation="vertical" size={0}>
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              企业代码: {item.company.code}
                            </span>
                            {item.company.description && (
                              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {item.company.description}
                              </span>
                            )}
                            {item.memberCount > 0 && (
                              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                成员数: {item.memberCount}
                              </span>
                            )}
                            {item.creatorName && (
                              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                创建人: {item.creatorName}
                              </span>
                            )}
                          </Space>
                        </Flex>
                        <Space>
                          {isSelected && (
                            <Tag color="blue">已选择</Tag>
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
            <div style={{ marginBottom: 8, fontWeight: 500 }}>申请理由</div>
            <TextArea
              rows={4}
              placeholder="请简要说明您申请加入该企业的理由..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              showCount
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>取消</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleApply}
            disabled={!selectedCompany || !reason.trim()}
            loading={loading}
          >
            提交申请
          </Button>
        </div>
      </Space>
    </Modal>
  );
};
