import { CloseOutlined, EditOutlined, EyeOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIntl } from '@umijs/max';
import { App, Button, Checkbox, Empty, Form, Input, Radio, Select, Space, Switch, Upload } from 'antd';
import React, { useEffect, useState } from 'react';
import { FieldPropertyPanel } from './FieldPropertyPanel';
import { FormDefinition, FormField, getFieldTypeConfig, LIBRARY_PREFIX, normalizeFieldType } from './types';

const { TextArea } = Input;
const { Group: RadioGroup } = Radio;

function DraggableLibraryItem({
  ft,
  onAdd,
}: {
  ft: { type: string; label: string; icon: string };
  onAdd: (type: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${LIBRARY_PREFIX}${ft.type}`,
    data: { type: ft.type, fromLibrary: true },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`library-item ${isDragging ? 'dragging' : ''}`}
      onClick={() => onAdd(ft.type)}
    >
      <span className="item-icon">{ft.icon}</span>
      <span className="item-label">{ft.label}</span>
    </div>
  );
}

function DroppableCanvas({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' });
  return (
    <div ref={setNodeRef} className={`canvas-content ${isOver ? 'canvas-drop-active' : ''}`}>
      {children}
    </div>
  );
}

function SortableField({
  field,
  selected,
  onSelect,
  onDelete,
  onChange,
}: {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onChange?: (field: FormField) => void;
}) {
  const intl = useIntl();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderFieldPreview = () => {
    const handleChange = (val: string) => onChange?.({ ...field, defaultValue: val });
    switch (normalizeFieldType(field.type)) {
      case 'Text':
        return (
          <Input
            placeholder={field.placeholder}
            value={field.defaultValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'TextArea':
        return (
          <TextArea
            rows={2}
            placeholder={field.placeholder}
            value={field.defaultValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'Number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={field.defaultValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'Date':
        return (
          <Input
            type="date"
            placeholder={field.placeholder}
            value={field.defaultValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'DateTime':
        return (
          <Input
            type="datetime-local"
            placeholder={field.placeholder}
            value={field.defaultValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'Select':
        return (
          <Select placeholder={field.placeholder} value={field.defaultValue} onChange={(val) => handleChange(val)}>
            {field.options?.map((o) => (
              <Select.Option key={o.value} value={o.value}>
                {o.label}
              </Select.Option>
            ))}
          </Select>
        );
      case 'Radio':
        return (
          <RadioGroup value={field.defaultValue} onChange={(e) => handleChange(e.target.value)}>
            {field.options?.map((o) => (
              <Radio key={o.value} value={o.value}>
                {o.label}
              </Radio>
            ))}
          </RadioGroup>
        );
      case 'Checkbox':
        return (
          <Checkbox.Group
            options={field.options?.map((o) => ({ label: o.label, value: o.value }))}
            value={field.defaultValue?.split(',').filter(Boolean)}
            onChange={(val) => handleChange(val?.join(','))}
          />
        );
      case 'Switch':
        return (
          <Switch
            checked={field.defaultValue === 'true'}
            onChange={(val) => handleChange(String(val))}
            checkedChildren={intl.formatMessage({ id: 'pages.forms.status.yes' })}
            unCheckedChildren={intl.formatMessage({ id: 'pages.forms.status.no' })}
          />
        );
      case 'Attachment':
        return (
          <Upload>
            <Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.forms.fieldType.upload' })}</Button>
          </Upload>
        );
      default:
        return (
          <Input
            placeholder={field.placeholder}
            value={field.defaultValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`canvas-field ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div>
        <div style={{ marginBottom: 10 }}>
          {field.required && <span className="required-mark">*</span>} {field.label}
        </div>
        {renderFieldPreview()}
      </div>
      <Button
        type="text"
        size="small"
        danger
        icon={<CloseOutlined />}
        className="field-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      />
    </div>
  );
}

export const FormDesigner: React.FC<{ form: FormDefinition; onSave: (form: FormDefinition) => void; intl: any }> = ({
  form,
  onSave,
  intl,
}) => {
  const { message } = App.useApp();
  const FIELD_TYPES = getFieldTypeConfig(intl);
  const [fields, setFields] = useState<FormField[]>(form.fields || []);
  const [formData, setFormData] = useState({
    name: form.name,
    version: form.version || 1,
    isActive: form.isActive ?? true,
  });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    const normalized = (form.fields || []).map((f) => ({ ...f, type: normalizeFieldType(f.type) }));
    setFields(normalized);
    setFormData({ name: form.name, version: form.version || 1, isActive: form.isActive ?? true });
    setSelectedFieldId(null);
    setPreviewMode(false);
    setActiveId(null);
    setOverId(null);
  }, [form]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const createField = (type: string): FormField => {
    const fieldType = FIELD_TYPES.find((f) => f.type === type)!;
    return {
      id: `field_${Date.now()}`,
      label: `${fieldType.label}_${fields.length + 1}`,
      type: type as FormField['type'],
      required: false,
      dataKey: `field_${fields.length + 1}`,
      options:
        type === 'Select' || type === 'Radio' || type === 'Checkbox'
          ? [
              { label: '选项1', value: 'option1' },
              { label: '选项2', value: 'option2' },
            ]
          : undefined,
    };
  };

  const addField = (type: string) => {
    const newField = createField(type);
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    setActiveId(activeId);

    const isFromLibrary = activeId.startsWith(LIBRARY_PREFIX);
    if (isFromLibrary) {
      const fieldType = activeId.replace(LIBRARY_PREFIX, '');
      const tempId = `temp_${Date.now()}`;
      const tempField: FormField = {
        id: tempId,
        label: FIELD_TYPES.find((f) => f.type === fieldType)?.label || '新字段',
        type: fieldType as FormField['type'],
        required: false,
        dataKey: '',
      };
      setFields((prev) => [...prev, tempField]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverId(null);
      return;
    }
    const isFromLibrary = String(active.id).startsWith(LIBRARY_PREFIX);
    if (!isFromLibrary) {
      setOverId(null);
      return;
    }
    const overId = String(over.id);
    if (overId === 'canvas-droppable' || overId.startsWith('field_')) {
      setOverId(overId);
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) {
      setFields((prev) => prev.filter((f) => !f.id.startsWith('temp_')));
      return;
    }

    const isFromLibrary = String(active.id).startsWith(LIBRARY_PREFIX);

    if (isFromLibrary) {
      const tempField = fields.find((f) => f.id.startsWith('temp_'));
      if (!tempField) return;

      const targetId = String(over.id);
      const fieldType = String(active.id).replace(LIBRARY_PREFIX, '');
      const finalField: FormField = {
        ...tempField,
        id: `field_${Date.now()}`,
        type: fieldType as FormField['type'],
        label: `${FIELD_TYPES.find((f) => f.type === fieldType)?.label || '字段'}_${fields.length + 1}`,
        dataKey: `field_${fields.length + 1}`,
        options:
          fieldType === 'Select' || fieldType === 'Radio' || fieldType === 'Checkbox'
            ? [
                { label: '选项1', value: 'option1' },
                { label: '选项2', value: 'option2' },
              ]
            : undefined,
      };

      setFields((prev) => {
        const filtered = prev.filter((f) => f.id !== tempField.id);
        if (targetId === 'canvas-droppable') {
          return [...filtered, finalField];
        }
        const overIndex = filtered.findIndex((f) => f.id === targetId);
        if (overIndex >= 0) {
          return [...filtered.slice(0, overIndex), finalField, ...filtered.slice(overIndex)];
        }
        return [...filtered, finalField];
      });
      setSelectedFieldId(finalField.id);
      return;
    }

    if (active.id !== over.id && String(over.id).startsWith('field_')) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          return arrayMove(prev, oldIndex, newIndex);
        }
        return prev;
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const updateField = (updated: FormField) => {
    setFields(fields.map((f) => (f.id === updated.id ? updated : f)));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleSave = () => {
    onSave({ ...form, ...formData, fields });
    message.success(intl.formatMessage({ id: 'pages.forms.message.saveSuccess' }));
  };

  if (previewMode) {
    return (
      <div className="form-preview">
        <div className="preview-header">
          <span>
            {intl.formatMessage({ id: 'pages.forms.designer.preview' })}: {formData.name}
          </span>
          <Button icon={<EditOutlined />} onClick={() => setPreviewMode(false)}>
            {intl.formatMessage({ id: 'pages.forms.designer.edit' })}
          </Button>
        </div>
        <Form layout="vertical" style={{ maxWidth: 600, margin: '0 auto' }}>
          {fields.map((field) => (
            <Form.Item key={field.id} label={field.label} required={field.required}>
              {field.type === 'Text' && <Input placeholder={field.placeholder} defaultValue={field.defaultValue} />}
              {field.type === 'TextArea' && (
                <TextArea rows={4} placeholder={field.placeholder} defaultValue={field.defaultValue} />
              )}
              {field.type === 'Number' && (
                <Input type="number" placeholder={field.placeholder} defaultValue={field.defaultValue} />
              )}
              {field.type === 'Date' && (
                <Input type="date" placeholder={field.placeholder} defaultValue={field.defaultValue} />
              )}
              {field.type === 'DateTime' && (
                <Input type="datetime-local" placeholder={field.placeholder} defaultValue={field.defaultValue} />
              )}
              {field.type === 'Select' && (
                <Select placeholder={field.placeholder} defaultValue={field.defaultValue}>
                  {field.options?.map((o) => (
                    <Select.Option key={o.value} value={o.value}>
                      {o.label}
                    </Select.Option>
                  ))}
                </Select>
              )}
              {field.type === 'Radio' && (
                <RadioGroup defaultValue={field.defaultValue}>
                  {field.options?.map((o) => (
                    <Radio key={o.value} value={o.value}>
                      {o.label}
                    </Radio>
                  ))}
                </RadioGroup>
              )}
              {field.type === 'Checkbox' && (
                <Checkbox.Group
                  options={field.options?.map((o) => ({ label: o.label, value: o.value }))}
                  defaultValue={field.defaultValue?.split(',').filter(Boolean)}
                />
              )}
              {field.type === 'Switch' && (
                <Switch
                  defaultChecked={field.defaultValue === 'true'}
                  checkedChildren={intl.formatMessage({ id: 'pages.forms.status.yes' })}
                  unCheckedChildren={intl.formatMessage({ id: 'pages.forms.status.no' })}
                />
              )}
              {field.type === 'Attachment' && (
                <Upload>
                  <Button icon={<UploadOutlined />}>
                    {intl.formatMessage({ id: 'pages.forms.fieldType.upload' })}
                  </Button>
                </Upload>
              )}
            </Form.Item>
          ))}
        </Form>
      </div>
    );
  }

  return (
    <div className="form-designer">
      <div className="designer-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 60 }}>{intl.formatMessage({ id: 'pages.forms.form.name' })}</span>
          <Input
            placeholder={intl.formatMessage({ id: 'pages.forms.form.namePlaceholder' })}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{ width: 200 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 40 }}>{intl.formatMessage({ id: 'pages.forms.form.enabled' })}</span>
          <Switch
            checkedChildren={intl.formatMessage({ id: 'pages.forms.form.enabledOn' })}
            unCheckedChildren={intl.formatMessage({ id: 'pages.forms.form.enabledOff' })}
            checked={formData.isActive}
            onChange={(v) => setFormData({ ...formData, isActive: v })}
          />
        </div>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            {intl.formatMessage({ id: 'pages.forms.action.save' })}
          </Button>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewMode(true)}>
            {intl.formatMessage({ id: 'pages.forms.action.preview' })}
          </Button>
        </Space>
      </div>
      <div className="designer-body">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="field-library">
            <div className="library-header">{intl.formatMessage({ id: 'pages.forms.designer.fieldLibrary' })}</div>
            <div className="library-content">
              {FIELD_TYPES.map((ft) => (
                <DraggableLibraryItem key={ft.type} ft={ft} onAdd={addField} />
              ))}
            </div>
          </div>
          <div className="form-canvas">
            <div className="canvas-header">{intl.formatMessage({ id: 'pages.forms.designer.formCanvas' })}</div>
            <DroppableCanvas>
              {fields.length === 0 ? (
                <Empty
                  description={intl.formatMessage({ id: 'pages.forms.designer.dragDropHint' })}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {fields.map((field, index) => (
                    <React.Fragment key={field.id}>
                      {overId === field.id && index > 0 && <div className="canvas-field-placeholder" />}
                      <SortableField
                        field={field}
                        selected={field.id === selectedFieldId}
                        onSelect={() => setSelectedFieldId(field.id)}
                        onDelete={() => deleteField(field.id)}
                        onChange={updateField}
                      />
                    </React.Fragment>
                  ))}
                  {overId === 'canvas-droppable' && fields.length > 0 && <div className="canvas-field-placeholder" />}
                </SortableContext>
              )}
            </DroppableCanvas>
          </div>
          <DragOverlay>
            {activeId && String(activeId).startsWith(LIBRARY_PREFIX) ? (
              <div className="library-item drag-overlay">
                <span className="item-icon">
                  {FIELD_TYPES.find((f) => `${LIBRARY_PREFIX}${f.type}` === activeId)?.icon}
                </span>
                <span className="item-label">
                  {FIELD_TYPES.find((f) => `${LIBRARY_PREFIX}${f.type}` === activeId)?.label}
                </span>
              </div>
            ) : activeId ? (
              <div className="canvas-field drag-overlay">
                {(() => {
                  const f = fields.find((x) => x.id === activeId);
                  return f ? (
                    <div>
                      <div>{f.label}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <div
          className="field-properties"
          style={{ width: 280, borderLeft: '1px solid #f0f0f0', background: 'var(--ant-color-fill-tertiary)', padding: 12 }}
        >
          {selectedField ? (
            <FieldPropertyPanel
              field={selectedField}
              onChange={updateField}
              onClose={() => setSelectedFieldId(null)}
              intl={intl}
            />
          ) : (
            <Empty
              description={intl.formatMessage({ id: 'pages.forms.designer.selectFieldToEdit' })}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </div>
    </div>
  );
};
