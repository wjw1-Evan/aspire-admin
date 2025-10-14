import { ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { message } from 'antd';
import { updateCurrentCompany } from '@/services/company';

interface EditCompanyModalProps {
  visible: boolean;
  company: API.Company | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function EditCompanyModal({
  visible,
  company,
  onCancel,
  onSuccess,
}: EditCompanyModalProps) {
  const handleSubmit = async (values: API.UpdateCompanyRequest) => {
    try {
      const response = await updateCurrentCompany(values);

      if (response.success) {
        message.success('企业信息更新成功');
        onSuccess();
        return true;
      }

      message.error(response.errorMessage || '更新失败');
      return false;
    } catch (error: any) {
      message.error(error.message || '更新失败');
      return false;
    }
  };

  return (
    <ModalForm
      title="编辑企业信息"
      open={visible}
      onFinish={handleSubmit}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      initialValues={company || undefined}
      width={600}
    >
      <ProFormText
        name="name"
        label="企业名称"
        placeholder="请输入企业名称"
        rules={[
          { required: true, message: '请输入企业名称' },
          { min: 2, max: 100, message: '企业名称长度必须在2-100个字符之间' },
        ]}
      />

      <ProFormTextArea
        name="description"
        label="企业描述"
        placeholder="请输入企业描述"
        fieldProps={{
          rows: 3,
          maxLength: 500,
          showCount: true,
        }}
      />

      <ProFormText
        name="industry"
        label="所属行业"
        placeholder="请输入所属行业"
        rules={[{ max: 50, message: '行业名称不能超过50个字符' }]}
      />

      <ProFormText
        name="contactName"
        label="联系人"
        placeholder="请输入联系人姓名"
        rules={[{ max: 50, message: '联系人长度不能超过50个字符' }]}
      />

      <ProFormText
        name="contactEmail"
        label="联系邮箱"
        placeholder="请输入联系邮箱"
        rules={[{ type: 'email', message: '邮箱格式不正确' }]}
      />

      <ProFormText
        name="contactPhone"
        label="联系电话"
        placeholder="请输入联系电话"
        rules={[
          {
            pattern: /^1[3-9]\d{9}$/,
            message: '请输入有效的手机号码',
          },
        ]}
      />

      <ProFormText
        name="logo"
        label="企业Logo"
        placeholder="请输入Logo URL"
        tooltip="暂时只支持输入图片URL，后续将支持上传"
      />
    </ModalForm>
  );
}

