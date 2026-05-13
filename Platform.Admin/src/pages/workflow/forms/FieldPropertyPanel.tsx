import { CloseOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Collapse, Input, InputNumber, Select, Switch } from 'antd';
import { FormField, getFieldTypeConfig } from './types';

const { TextArea } = Input;

export function FieldPropertyPanel({
  field,
  onChange,
  onClose,
  intl,
}: {
  field: FormField;
  onChange: (field: FormField) => void;
  onClose: () => void;
  intl: any;
}) {
  return (
    <div className="field-property-panel">
      <div className="panel-header">
        <span>{intl.formatMessage({ id: 'pages.forms.designer.fieldProperties' })}</span>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      <div className="panel-body">
        <div className="property-group">
          <label>{intl.formatMessage({ id: 'pages.forms.field.label' })}</label>
          <Input
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
            placeholder={intl.formatMessage({ id: 'pages.forms.field.labelPlaceholder' })}
          />
        </div>
        <div className="property-group">
          <label>{intl.formatMessage({ id: 'pages.forms.field.dataKey' })}</label>
          <Input
            value={field.dataKey}
            onChange={(e) => onChange({ ...field, dataKey: e.target.value })}
            placeholder={intl.formatMessage({ id: 'pages.forms.field.dataKeyPlaceholder' })}
          />
        </div>
        <div className="property-group">
          <label>{intl.formatMessage({ id: 'pages.forms.field.type' })}</label>
          <Select value={field.type} onChange={(type) => onChange({ ...field, type })} style={{ width: '100%' }}>
            {getFieldTypeConfig(intl).map((t) => (
              <Select.Option key={t.type} value={t.type}>
                {t.label}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className="property-group">
          <label>{intl.formatMessage({ id: 'pages.forms.field.required' })}</label>
          <Switch checked={field.required} onChange={(required) => onChange({ ...field, required })} />
        </div>
        <div className="property-group">
          <label>{intl.formatMessage({ id: 'pages.forms.field.placeholder' })}</label>
          <Input
            value={field.placeholder}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            placeholder={intl.formatMessage({ id: 'pages.forms.field.placeholderPlaceholder' })}
          />
        </div>
        <div className="property-group">
          <label>{intl.formatMessage({ id: 'pages.forms.field.defaultValue' })}</label>
          <Input
            value={field.defaultValue}
            onChange={(e) => onChange({ ...field, defaultValue: e.target.value })}
            placeholder={intl.formatMessage({ id: 'pages.forms.field.defaultValuePlaceholder' })}
          />
        </div>
        {['Select', 'Radio', 'Checkbox'].includes(field.type) && (
          <div className="property-group">
            <label>
              {intl.formatMessage({ id: 'pages.forms.field.options' })} (
              {intl.formatMessage({ id: 'pages.forms.field.optionsPlaceholder' })})
            </label>
            <TextArea
              value={field.options?.map((o) => `${o.value},${o.label}`).join('\n')}
              onChange={(e) => {
                const options = e.target.value
                  .split('\n')
                  .filter(Boolean)
                  .map((line) => {
                    const [value, label] = line.split(',');
                    return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' };
                  })
                  .filter((o) => o.value);
                onChange({ ...field, options });
              }}
              rows={4}
              placeholder={intl.formatMessage({ id: 'pages.forms.field.optionsExample' })}
            />
          </div>
        )}
        <div className="property-group">
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'rules',
                label: <span style={{ fontWeight: 500 }}>{intl.formatMessage({ id: 'pages.forms.field.rules' })}</span>,
                children: (
                  <div style={{ marginTop: 4 }}>
                    {(field.rules || []).map((rule, index) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: 8,
                          padding: '8px 8px 4px',
                          background: '#fafafa',
                          border: '1px solid #f0f0f0',
                          borderRadius: 4,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <Select
                            value={rule.type}
                            onChange={(type) => {
                              const newRules = [...(field.rules || [])];
                              newRules[index] = { ...newRules[index], type };
                              onChange({ ...field, rules: newRules });
                            }}
                            style={{ flex: 1 }}
                            placeholder={intl.formatMessage({ id: 'pages.forms.field.rules.type' })}
                            options={[
                              {
                                value: 'required',
                                label: intl.formatMessage({ id: 'pages.forms.field.rules.typeRequired' }),
                              },
                              {
                                value: 'pattern',
                                label: intl.formatMessage({ id: 'pages.forms.field.rules.typePattern' }),
                              },
                              { value: 'min', label: intl.formatMessage({ id: 'pages.forms.field.rules.typeMin' }) },
                              { value: 'max', label: intl.formatMessage({ id: 'pages.forms.field.rules.typeMax' }) },
                              {
                                value: 'minLength',
                                label: intl.formatMessage({ id: 'pages.forms.field.rules.typeMinLength' }),
                              },
                              {
                                value: 'maxLength',
                                label: intl.formatMessage({ id: 'pages.forms.field.rules.typeMaxLength' }),
                              },
                            ]}
                          />
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => {
                              const newRules = (field.rules || []).filter((_, i) => i !== index);
                              onChange({ ...field, rules: newRules });
                            }}
                          />
                        </div>
                        {rule.type === 'pattern' && (
                          <Input
                            value={rule.pattern}
                            onChange={(e) => {
                              const newRules = [...(field.rules || [])];
                              newRules[index] = { ...newRules[index], pattern: e.target.value };
                              onChange({ ...field, rules: newRules });
                            }}
                            placeholder={intl.formatMessage({ id: 'pages.forms.field.rules.pattern' })}
                            style={{ marginBottom: 4 }}
                          />
                        )}
                        {(rule.type === 'min' || rule.type === 'max') && (
                          <InputNumber
                            value={rule.type === 'min' ? rule.min : rule.max}
                            onChange={(val) => {
                              const newRules = [...(field.rules || [])];
                              newRules[index] = { ...newRules[index], [rule.type]: val ?? 0 };
                              onChange({ ...field, rules: newRules });
                            }}
                            placeholder={
                              rule.type === 'min'
                                ? intl.formatMessage({ id: 'pages.forms.field.rules.minValue' })
                                : intl.formatMessage({ id: 'pages.forms.field.rules.maxValue' })
                            }
                            style={{ width: '100%', marginBottom: 4 }}
                          />
                        )}
                        {(rule.type === 'minLength' || rule.type === 'maxLength') && (
                          <InputNumber
                            value={rule.type === 'minLength' ? rule.min : rule.max}
                            onChange={(val) => {
                              const newRules = [...(field.rules || [])];
                              newRules[index] = {
                                ...newRules[index],
                                [rule.type === 'minLength' ? 'min' : 'max']: val ?? 0,
                              };
                              onChange({ ...field, rules: newRules });
                            }}
                            placeholder={
                              rule.type === 'minLength'
                                ? intl.formatMessage({ id: 'pages.forms.field.rules.minLengthValue' })
                                : intl.formatMessage({ id: 'pages.forms.field.rules.maxLengthValue' })
                            }
                            style={{ width: '100%', marginBottom: 4 }}
                            min={0}
                          />
                        )}
                        <Input
                          value={rule.message}
                          onChange={(e) => {
                            const newRules = [...(field.rules || [])];
                            newRules[index] = { ...newRules[index], message: e.target.value };
                            onChange({ ...field, rules: newRules });
                          }}
                          placeholder={intl.formatMessage({ id: 'pages.forms.field.rules.message' })}
                        />
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      size="small"
                      onClick={() => {
                        const newRules = [...(field.rules || []), { type: 'required', message: '' }];
                        onChange({ ...field, rules: newRules });
                      }}
                    >
                      {intl.formatMessage({ id: 'pages.forms.field.rules.addRule' })}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
