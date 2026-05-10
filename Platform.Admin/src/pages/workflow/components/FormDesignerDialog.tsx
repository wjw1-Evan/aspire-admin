import React, { useState } from 'react';
import { Button, Modal, Form, Input, App } from 'antd';
import { useIntl } from '@umijs/max';
import { FormDesigner } from '@/pages/workflow/forms/FormDesigner';
import { createForm, updateForm } from '@/services/form/api';
import type { FormDefinition as ApiFormDefinition } from '@/services/form/api';
import type { FormDefinition } from '@/pages/workflow/forms/types';

interface FormDesignerDialogProps {
  visible: boolean;
  editingForm: FormDefinition | null;
  onClose: () => void;
  onSuccess: (form: FormDefinition) => void;
}

const FormDesignerDialog: React.FC<FormDesignerDialogProps> = ({ visible, editingForm, onClose, onSuccess }) => {
  const intl = useIntl();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(editingForm?.name || '');
  const [designerForm, setDesignerForm] = useState<FormDefinition>(editingForm || {
    name: '', version: 1, isActive: true, fields: [],
  });
  const [showNameInput, setShowNameInput] = useState(!editingForm);

  React.useEffect(() => {
    if (visible) {
      setName(editingForm?.name || '');
      setDesignerForm(editingForm || { name: '', version: 1, isActive: true, fields: [] });
      setShowNameInput(!editingForm);
    }
  }, [visible, editingForm]);

  const handleDesignerSave = async (form: FormDefinition) => {
    if (!form.name?.trim()) {
      message.warning('请输入表单名称');
      return;
    }

    setSaving(true);
    try {
      const formData: Record<string, unknown> = {
        ...form,
        key: form.key || `form_${Date.now()}`,
        version: form.version || 1,
        fields: form.fields || [],
      };
      let result;

      if (editingForm?.id) {
        result = await updateForm(editingForm.id, formData as Partial<ApiFormDefinition>);
      } else {
        result = await createForm(formData as Partial<ApiFormDefinition>);
      }

      if (result.success && result.data) {
        message.success('表单保存成功');
        onSuccess(result.data as unknown as FormDefinition);
      }
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editingForm ? `编辑表单: ${editingForm.name}` : '新建表单'}
      open={visible}
      onCancel={onClose}
      width={960}
      style={{ top: 20 }}
      footer={null}
      destroyOnClose
    >
      {showNameInput && (
        <div style={{ marginBottom: 16 }}>
          <Form.Item label="表单名称" required style={{ marginBottom: 0 }}>
            <Input
              placeholder="请输入表单名称"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDesignerForm(prev => ({ ...prev, name: e.target.value }));
              }}
            />
          </Form.Item>
        </div>
      )}
      <div style={{ height: 520, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
        <FormDesigner
          key={editingForm?.id || 'new'}
          form={designerForm}
          onSave={(form) => { handleDesignerSave(form); }}
          intl={intl}
        />
      </div>
    </Modal>
  );
};

export default FormDesignerDialog;
