import React from 'react';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { createCompany } from '@/services/company';

interface CreateCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 新建企业模态框组件
 */
export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  /**
   * 提交创建企业
   */
  const handleSubmit = async (values: API.CreateCompanyRequest) => {
    try {
      // 企业代码由后端自动生成，不需要传递
      const { code: _code, ...requestData } = values;
      
      const response = await createCompany(requestData);
      if (response.success && response.data) {
        message.success('企业创建成功！您已成为该企业的管理员。');
        onSuccess();
        onClose();
        return true;
      } else {
        message.error(response.errorMessage || '创建企业失败');
        return false;
      }
    } catch (error: any) {
      message.error(error.message || '创建企业失败');
      return false;
    }
  };

  return (
    <ModalForm<API.CreateCompanyRequest>
      title="新建企业"
      open={open}
      onOpenChange={(visible) => {
        if (!visible) {
          onClose();
        }
      }}
      onFinish={handleSubmit}
      width={600}
      layout="vertical"
      modalProps={{
        destroyOnClose: true,
      }}
    >
      <ProFormText
        name="name"
        label="企业名称"
        placeholder="请输入企业名称"
        rules={[
          { required: true, message: '请输入企业名称' },
          { min: 2, max: 100, message: '企业名称长度必须在2-100个字符之间' },
        ]}
        fieldProps={{
          maxLength: 100,
        }}
      />

      <ProFormText
        name="description"
        label="企业描述"
        placeholder="请输入企业描述（可选）"
        rules={[{ max: 500, message: '描述长度不能超过500个字符' }]}
        fieldProps={{
          maxLength: 500,
        }}
      />

      <ProFormText
        name="industry"
        label="行业"
        placeholder="请输入行业（可选）"
        rules={[{ max: 50, message: '行业长度不能超过50个字符' }]}
        fieldProps={{
          maxLength: 50,
        }}
      />
    </ModalForm>
  );
};

