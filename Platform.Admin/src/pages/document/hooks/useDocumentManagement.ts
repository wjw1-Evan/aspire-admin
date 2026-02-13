import { useState, useRef, useEffect } from 'react';
import { Form } from 'antd';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import type { ActionType } from '@/types/pro-components';
import {
    getDocumentList,
    getDocumentStatistics,
    getDocumentDetail,
    submitDocument,
    deleteDocument,
    getDocumentInstanceForm,
    uploadDocumentAttachment,
    type Document,
    type DocumentStatistics,
    type DocumentQueryParams,
    DocumentStatus,
} from '@/services/document/api';
import {
    getWorkflowList,
    getWorkflowDetail,
    getDocumentCreateForm,
    getNodeForm,
    createAndStartDocumentWorkflow,
    type WorkflowDefinition,
    type FormDefinition,
    FormFieldType,
} from '@/services/workflow/api';
import { type UploadFile, type UploadProps } from 'antd/es/upload';

export const useDocumentManagement = () => {
    const intl = useIntl();
    const message = useMessage();
    const actionRef = useRef<ActionType>(null);
    const [form] = Form.useForm();
    const [wfForm] = Form.useForm();

    // Detail Drawer States
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);
    const [detailFormDef, setDetailFormDef] = useState<FormDefinition | null>(null);
    const [detailFormValues, setDetailFormValues] = useState<Record<string, any> | null>(null);
    const [detailNodeFormDef, setDetailNodeFormDef] = useState<FormDefinition | null>(null);
    const [detailNodeFormValues, setDetailNodeFormValues] = useState<Record<string, any> | null>(null);
    const [detailNodeForms, setDetailNodeForms] = useState<Record<string, { def: FormDefinition | null; values: Record<string, any> }>>({});
    const [detailWorkflowDef, setDetailWorkflowDef] = useState<WorkflowDefinition | null>(null);
    const [detailVisibleLoading, setDetailVisibleLoading] = useState(false);

    // Submit Modal States
    const [submitModalVisible, setSubmitModalVisible] = useState(false);
    const [submittingDocument, setSubmittingDocument] = useState<Document | null>(null);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');

    // Create Modal States
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [isFormStep, setIsFormStep] = useState(false);
    const [workflowFormDef, setWorkflowFormDef] = useState<FormDefinition | null>(null);
    const [workflowInitialValues, setWorkflowInitialValues] = useState<Record<string, any>>({});
    const [wfAttachmentFileList, setWfAttachmentFileList] = useState<UploadFile[]>([]);
    const [nextStepLoading, setNextStepLoading] = useState(false);

    // List & Statistics States
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);
    const [searchParams, setSearchParams] = useState<DocumentQueryParams>({
        page: 1,
        pageSize: 10,
    });

    const fetchStatistics = async () => {
        try {
            const resp = await getDocumentStatistics();
            if (resp.success) {
                setStatistics(resp.data || null);
            }
        } catch (e) {
            console.error('获取统计信息失败', e);
        }
    };

    const fetchActiveWorkflows = async () => {
        try {
            const resp = await getWorkflowList({ page: 1, pageSize: 100, isActive: true });
            if (resp.success) {
                setWorkflows(resp.data?.list || []);
            }
        } catch (e) {
            console.error('加载流程列表失败', e);
        }
    };

    useEffect(() => {
        fetchStatistics();
    }, []);

    const handleRefresh = () => {
        actionRef.current?.reload?.();
        fetchStatistics();
    };

    const handleSearch = (values: any) => {
        setSearchParams((prev: DocumentQueryParams) => ({ ...prev, ...values, page: 1 }));
        actionRef.current?.reloadAndReset?.();
    };

    const handleReset = () => {
        form.resetFields();
        setSearchParams({ page: 1, pageSize: 10 });
        actionRef.current?.reset?.();
    };

    const handleViewDetail = async (record: Document) => {
        try {
            setDetailVisibleLoading(true);
            const response = await getDocumentDetail(record.id!);
            if (response.success && response.data) {
                setDetailData(response.data);
                const rawData: any = response.data as any;
                const doc = rawData.document ?? rawData;
                const instance = response.data.workflowInstance ?? doc?.workflowInstance;
                const defId = instance?.workflowDefinitionId;
                const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
                const currentNodeId = instance?.currentNodeId;
                const approvalHistory = response.data?.approvalHistory ?? doc?.approvalHistory ?? instance?.approvalHistory ?? [];
                const workflowDefinition = response.data?.workflowDefinition;

                if (workflowDefinition) {
                    setDetailWorkflowDef(workflowDefinition);
                } else if (defId) {
                    try {
                        const defResp = await getWorkflowDetail(defId);
                        if (defResp.success) {
                            setDetailWorkflowDef(defResp.data || null);
                        } else {
                            setDetailWorkflowDef(null);
                        }
                    } catch (err) {
                        console.error('加载流程定义失败', err);
                        setDetailWorkflowDef(null);
                    }
                } else {
                    setDetailWorkflowDef(null);
                }

                if (instanceId) {
                    try {
                        const formResp = await getDocumentInstanceForm(record.id!);
                        if (formResp.success) {
                            const formDef = formResp.data?.form || null;
                            const values = formResp.data?.initialValues || {};
                            setDetailFormDef(formDef);
                            setDetailFormValues(values);
                        } else {
                            setDetailFormDef(null);
                            setDetailFormValues(null);
                        }
                    } catch (e) {
                        console.error('加载表单定义失败', e);
                        setDetailFormDef(null);
                        setDetailFormValues(null);
                    }
                } else {
                    setDetailFormDef(null);
                    setDetailFormValues(null);
                }

                if (defId && !instanceId) {
                    try {
                        const formResp = await getDocumentCreateForm(defId);
                        if (formResp.success) {
                            const formDef = formResp.data?.form || null;
                            const dataScopeKey = formResp.data?.dataScopeKey;
                            const sourceFormData = doc?.formData || {};
                            const values = dataScopeKey ? sourceFormData?.[dataScopeKey] || {} : sourceFormData || {};
                            setDetailFormDef(formDef);
                            setDetailFormValues(values);
                        } else {
                            setDetailFormDef(null);
                            setDetailFormValues(null);
                        }
                    } catch (e) {
                        console.error('加载表单定义失败', e);
                        setDetailFormDef(null);
                        setDetailFormValues(null);
                    }
                }

                if (instanceId && currentNodeId) {
                    try {
                        const nodeFormResp = await getNodeForm(instanceId, currentNodeId);
                        if (nodeFormResp.success) {
                            setDetailNodeFormDef(nodeFormResp.data?.form || null);
                            setDetailNodeFormValues(nodeFormResp.data?.initialValues || {});
                        } else {
                            setDetailNodeFormDef(null);
                            setDetailNodeFormValues(null);
                        }
                    } catch (err) {
                        console.error('加载节点表单失败', err);
                        setDetailNodeFormDef(null);
                        setDetailNodeFormValues(null);
                    }

                    try {
                        const allNodeIds = Array.from(
                            new Set(
                                [currentNodeId, ...approvalHistory.map((h: any) => h.nodeId).filter(Boolean)],
                            ),
                        );
                        const forms: Record<string, { def: FormDefinition | null; values: Record<string, any> }> = {};
                        for (const nid of allNodeIds) {
                            try {
                                const nf = await getNodeForm(instanceId, nid);
                                if (nf.success) {
                                    forms[nid] = {
                                        def: nf.data?.form || null,
                                        values: nf.data?.initialValues || {},
                                    };
                                }
                            } catch (e) {
                                console.error('加载节点表单失败', nid, e);
                            }
                        }
                        setDetailNodeForms(forms);
                    } catch (e) {
                        console.error('批量加载节点表单失败', e);
                        setDetailNodeForms({});
                    }
                } else {
                    setDetailNodeFormDef(null);
                    setDetailNodeFormValues(null);
                    setDetailNodeForms({});
                }
                setDetailVisible(true);
            }
        } catch (error) {
            console.error('获取详情失败:', error);
        } finally {
            setDetailVisibleLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!submittingDocument) return;

        if (!selectedWorkflowId) {
            message.warning(intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' }));
            return;
        }

        try {
            const response = await submitDocument(submittingDocument.id!, {
                workflowDefinitionId: selectedWorkflowId,
            });
            if (response.success) {
                message.success(intl.formatMessage({ id: 'pages.document.message.submitSuccess' }));
                setSubmitModalVisible(false);
                setSubmittingDocument(null);
                setSelectedWorkflowId('');
                handleRefresh();
            }
        } catch (error) {
            console.error('提交失败:', error);
            message.error(intl.formatMessage({ id: 'pages.document.message.submitFailed' }));
        }
    };

    const handleDelete = async (record: Document, modal: any) => {
        modal.confirm({
            title: intl.formatMessage({ id: 'pages.document.modal.confirmDelete' }),
            content: intl.formatMessage(
                { id: 'pages.document.modal.confirmDeleteContent' },
                { title: record.title }
            ),
            onOk: async () => {
                try {
                    const response = await deleteDocument(record.id!);
                    if (response.success) {
                        message.success(intl.formatMessage({ id: 'pages.document.message.deleteSuccess' }));
                        handleRefresh();
                    }
                } catch (error) {
                    console.error('删除失败:', error);
                    message.error(intl.formatMessage({ id: 'pages.document.message.deleteFailed' }));
                }
            },
        });
    };

    const onCreateOk = async () => {
        if (!isFormStep) {
            if (!selectedWorkflowId) {
                message.warning(intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' }));
                return;
            }
            try {
                setNextStepLoading(true);
                const resp = await getDocumentCreateForm(selectedWorkflowId);
                if (resp.success) {
                    const def = resp.data?.form || null;
                    setWorkflowFormDef(def);
                    const initVals = resp.data?.initialValues || {};
                    setWorkflowInitialValues(initVals);
                    wfForm.setFieldsValue({ values: initVals, attachmentIds: [] });
                    setIsFormStep(true);
                } else {
                    message.error(resp.message || intl.formatMessage({ id: 'pages.workflow.form.loadFailed', defaultMessage: '表单加载失败' }));
                }
            } catch (e) {
                console.error(e);
                message.error(intl.formatMessage({ id: 'pages.workflow.form.loadFailed', defaultMessage: '表单加载失败' }));
            } finally {
                setNextStepLoading(false);
            }
            return;
        }

        try {
            await wfForm.validateFields();
            const values = wfForm.getFieldValue('values') || {};
            const normalizedValues: Record<string, any> = { ...values };
            if (workflowFormDef?.fields?.length) {
                for (const f of workflowFormDef.fields) {
                    const key = f.dataKey;
                    const val = values[key];
                    if (val === undefined) continue;
                    switch (f.type) {
                        case FormFieldType.Date:
                        case FormFieldType.DateTime:
                            normalizedValues[key] = val && (val as any).toISOString ? (val as any).toISOString() : val;
                            break;
                        case FormFieldType.Number:
                            normalizedValues[key] = typeof val === 'string' ? Number(val) : val;
                            break;
                        case FormFieldType.Checkbox:
                            normalizedValues[key] = Array.isArray(val) ? val : [val];
                            break;
                        default:
                            normalizedValues[key] = val;
                    }
                }
            }
            const attachmentIds: string[] = wfForm.getFieldValue('attachmentIds') || [];
            if (!selectedWorkflowId) {
                message.error(intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请先选择流程' }));
                return;
            }
            setNextStepLoading(true);
            const resp = await createAndStartDocumentWorkflow(selectedWorkflowId, {
                values: normalizedValues,
                attachmentIds,
            });
            if (resp.success) {
                message.success(intl.formatMessage({ id: 'pages.document.create.message.createSuccess', defaultMessage: '创建并启动成功' }));
                setCreateModalVisible(false);
                setIsFormStep(false);
                setSelectedWorkflowId('');
                setWorkflowFormDef(null);
                setWorkflowInitialValues({});
                wfForm.resetFields();
                setWfAttachmentFileList([]);
                handleRefresh();
            } else {
                message.error(resp.message || intl.formatMessage({ id: 'pages.document.create.message.createFailed', defaultMessage: '创建失败' }));
            }
        } catch (err) {
            console.error(err);
            message.error(intl.formatMessage({ id: 'pages.document.create.message.createFailed', defaultMessage: '创建失败' }));
        } finally {
            setNextStepLoading(false);
        }
    };

    const wfUploadProps: UploadProps = {
        fileList: wfAttachmentFileList,
        multiple: true,
        customRequest: async (options) => {
            const { file, onSuccess, onError } = options;
            try {
                const response = await uploadDocumentAttachment(file as File);
                if (response.success && response.data?.id) {
                    const ids = wfForm.getFieldValue('attachmentIds') || [];
                    wfForm.setFieldsValue({ attachmentIds: [...ids, response.data.id] });

                    const newFile: UploadFile = {
                        uid: response.data.id,
                        name: response.data.name || (file as any).name,
                        status: 'done',
                        url: response.data.url,
                        size: response.data.size,
                        type: response.data.contentType,
                        response,
                    };

                    setWfAttachmentFileList((prev) => [...prev, newFile]);
                    onSuccess?.(response, file as any);
                } else {
                    const msg = response.message || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
                    message.error(msg);
                    onError?.(new Error(msg));
                }
            } catch (err: any) {
                const msg = err?.message || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
                message.error(msg);
                onError?.(err as Error);
            }
        },
        onRemove: (file) => {
            const currentIds: string[] = wfForm.getFieldValue('attachmentIds') || [];
            const filtered = currentIds.filter((id) => id !== file.uid);
            wfForm.setFieldsValue({ attachmentIds: filtered });
            setWfAttachmentFileList((prev) => prev.filter((f) => f.uid !== file.uid));
            return true;
        },
    };

    const resetCreateModal = () => {
        setCreateModalVisible(false);
        setIsFormStep(false);
        setSelectedWorkflowId('');
        setWorkflowFormDef(null);
        setWorkflowInitialValues({});
        wfForm.resetFields();
        setWfAttachmentFileList([]);
    };

    return {
        intl,
        message,
        actionRef,
        form,
        wfForm,
        detailVisible,
        setDetailVisible,
        detailData,
        setDetailData,
        detailFormDef,
        setDetailFormDef,
        detailFormValues,
        setDetailFormValues,
        detailNodeFormDef,
        setDetailNodeFormDef,
        detailNodeFormValues,
        setDetailNodeFormValues,
        detailNodeForms,
        setDetailNodeForms,
        detailWorkflowDef,
        setDetailWorkflowDef,
        detailVisibleLoading,
        submitModalVisible,
        setSubmitModalVisible,
        submittingDocument,
        setSubmittingDocument,
        selectedWorkflowId,
        setSelectedWorkflowId,
        createModalVisible,
        setCreateModalVisible,
        isFormStep,
        setIsFormStep,
        workflowFormDef,
        setWorkflowFormDef,
        workflowInitialValues,
        setWorkflowInitialValues,
        wfAttachmentFileList,
        setWfAttachmentFileList,
        nextStepLoading,
        workflows,
        statistics,
        searchParams,
        setSearchParams,
        handleRefresh,
        handleSearch,
        handleReset,
        handleViewDetail,
        handleSubmit,
        handleDelete,
        onCreateOk,
        wfUploadProps,
        fetchActiveWorkflows,
        resetCreateModal,
    };
};
