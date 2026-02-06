/**
 * DynamicFormFields - 动态表单字段渲染组件
 * 根据 FormDefinition 渲染不同类型的表单字段
 */

import React from 'react';
import { Form, Input, InputNumber, Select, Radio, Checkbox, Switch, DatePicker } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { FormFieldType, type FormDefinition } from '@/services/workflow/api';

interface DynamicFormFieldsProps {
    formDef: FormDefinition | null;
    namePrefix?: string | string[];
}

const DynamicFormFields: React.FC<DynamicFormFieldsProps> = ({ formDef, namePrefix }) => {
    const intl = useIntl();

    if (!formDef || !formDef.fields?.length) {
        return null;
    }

    return (
        <>
            {formDef.fields.map((f) => {
                const fieldName = namePrefix ? [...(Array.isArray(namePrefix) ? namePrefix : [namePrefix]), f.dataKey] : f.dataKey;

                const common = {
                    name: fieldName,
                    label: f.label,
                    rules: f.required ? [{ required: true, message: intl.formatMessage({ id: 'pages.form.required' }) }] : [],
                } as any;

                switch (f.type) {
                    case FormFieldType.Text:
                        return (
                            <Form.Item key={f.dataKey} {...common}>
                                <Input placeholder={f.placeholder} />
                            </Form.Item>
                        );
                    case FormFieldType.TextArea:
                        return (
                            <Form.Item key={f.dataKey} {...common}>
                                <Input.TextArea rows={4} placeholder={f.placeholder} />
                            </Form.Item>
                        );
                    case FormFieldType.Number:
                        return (
                            <Form.Item key={f.dataKey} {...common}>
                                <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                        );
                    case FormFieldType.Date:
                        return (
                            <Form.Item
                                key={f.dataKey}
                                {...common}
                                getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        );
                    case FormFieldType.DateTime:
                        return (
                            <Form.Item
                                key={f.dataKey}
                                {...common}
                                getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}
                            >
                                <DatePicker showTime style={{ width: '100%' }} />
                            </Form.Item>
                        );
                    case FormFieldType.Select:
                        return (
                            <Form.Item key={f.dataKey} {...common}>
                                <Select
                                    options={(f.options || []).map((o) => ({ label: o.label, value: o.value }))}
                                    placeholder={f.placeholder}
                                />
                            </Form.Item>
                        );
                    case FormFieldType.Radio:
                        return (
                            <Form.Item key={f.dataKey} {...common}>
                                <Radio.Group options={(f.options || []).map((o) => ({ label: o.label, value: o.value }))} />
                            </Form.Item>
                        );
                    case FormFieldType.Checkbox:
                        return (
                            <Form.Item key={f.dataKey} {...common}>
                                <Checkbox.Group options={(f.options || []).map((o) => ({ label: o.label, value: o.value }))} />
                            </Form.Item>
                        );
                    case FormFieldType.Switch:
                        return (
                            <Form.Item key={f.dataKey} {...common} valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        );
                    default:
                        return (
                            <Form.Item key={f.dataKey} {...common}>
                                <Input />
                            </Form.Item>
                        );
                }
            })}
        </>
    );
};

export default DynamicFormFields;
