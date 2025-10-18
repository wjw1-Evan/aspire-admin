import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, List, Modal, Space, App as AntApp } from 'antd';
import React, { useState } from 'react';
import { applyToJoinCompany, searchCompanies } from '@/services/company';

const { TextArea } = Input;
const { Search } = Input;

interface JoinCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CompanySearchResult {
  id: string;
  code: string;
  name: string;
  description?: string;
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
  const { message } = AntApp.useApp();
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
      console.error('搜索企业失败:', error);
      message.error(error.message || '搜索企业失败');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 选择企业
  const handleSelectCompany = (company: CompanySearchResult) => {
    setSelectedCompany(company);
  };

  // 提交申请
  const handleApply = async () => {
    if (!selectedCompany) {
      message.warning('请选择要加入的企业');
      return;
    }

    if (!reason.trim()) {
      message.warning('请输入申请理由');
      return;
    }

    setLoading(true);
    try {
      const response = await applyToJoinCompany({
        companyId: selectedCompany.id,
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
      console.error('提交申请失败:', error);
      message.error(error.message || '申请提交失败');
    } finally {
      setLoading(false);
    }
  };

  // 关闭模态框
  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal
      title="加入企业"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 搜索框 */}
        <div>
          <Search
            placeholder="搜索企业名称或代码"
            onSearch={handleSearch}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterButton={<SearchOutlined />}
            loading={searching}
            size="large"
          />
        </div>

        {/* 搜索结果列表 */}
        {searchResults.length > 0 && (
          <div
            style={{
              maxHeight: 300,
              overflow: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: 4,
            }}
          >
            <List
              dataSource={searchResults}
              renderItem={(item) => (
                <List.Item
                  onClick={() => handleSelectCompany(item)}
                  style={{
                    cursor: 'pointer',
                    background:
                      selectedCompany?.id === item.id ? '#e6f7ff' : undefined,
                    padding: '12px 16px',
                  }}
                  extra={
                    selectedCompany?.id === item.id && (
                      <span style={{ color: '#1890ff' }}>已选择</span>
                    )
                  }
                >
                  <List.Item.Meta
                    title={<span style={{ fontWeight: 500 }}>{item.name}</span>}
                    description={
                      <Space direction="vertical" size={0}>
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                          企业代码: {item.code}
                        </span>
                        {item.description && (
                          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                            {item.description}
                          </span>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
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
