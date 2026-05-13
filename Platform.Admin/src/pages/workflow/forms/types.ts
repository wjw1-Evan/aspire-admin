export const LIBRARY_PREFIX = 'lib_';

export interface FormDefinition {
  id?: string;
  name: string;
  key?: string;
  version?: number;
  latestVersionId?: string;
  isActive?: boolean;
  description?: string;
  fields?: FormField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FormVersion {
  id?: string;
  formDefinitionId?: string;
  version?: number;
  name?: string;
  fields?: FormField[];
  isActive?: boolean;
  createdAt?: string;
}

export interface FormField {
  id: string;
  label: string;
  type:
    | 'Text'
    | 'TextArea'
    | 'Number'
    | 'Date'
    | 'DateTime'
    | 'Select'
    | 'Radio'
    | 'Checkbox'
    | 'Switch'
    | 'Attachment';
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { label: string; value: string }[];
  rules?: { type: string; pattern?: string; message?: string; min?: number; max?: number }[];
  dataKey: string;
}

export interface FormStatistics {
  totalForms: number;
  activeForms: number;
}

export const FIELD_TYPE_MAP: Record<string, FormField['type']> = {
  text: 'Text',
  textarea: 'TextArea',
  number: 'Number',
  date: 'Date',
  datetime: 'DateTime',
  select: 'Select',
  radio: 'Radio',
  checkbox: 'Checkbox',
  switch: 'Switch',
  attachment: 'Attachment',
};

export const normalizeFieldType = (t: string | undefined): FormField['type'] => {
  if (!t) return 'Text';
  return FIELD_TYPE_MAP[t.toLowerCase()] || (t as FormField['type']);
};

export const getFieldTypeConfig = (intl: any) => [
  { type: 'Text', label: intl.formatMessage({ id: 'pages.forms.fieldType.text' }), icon: 'T' },
  { type: 'TextArea', label: intl.formatMessage({ id: 'pages.forms.fieldType.textArea' }), icon: 'T-' },
  { type: 'Number', label: intl.formatMessage({ id: 'pages.forms.fieldType.number' }), icon: '#' },
  { type: 'Date', label: intl.formatMessage({ id: 'pages.forms.fieldType.date' }), icon: 'D' },
  { type: 'DateTime', label: intl.formatMessage({ id: 'pages.forms.fieldType.dateTime' }), icon: 'D+' },
  { type: 'Select', label: intl.formatMessage({ id: 'pages.forms.fieldType.select' }), icon: 'v' },
  { type: 'Radio', label: intl.formatMessage({ id: 'pages.forms.fieldType.radio' }), icon: 'O' },
  { type: 'Checkbox', label: intl.formatMessage({ id: 'pages.forms.fieldType.checkbox' }), icon: '[]' },
  { type: 'Switch', label: intl.formatMessage({ id: 'pages.forms.fieldType.switch' }), icon: 'S' },
  { type: 'Attachment', label: intl.formatMessage({ id: 'pages.forms.fieldType.attachment' }), icon: 'A' },
];
