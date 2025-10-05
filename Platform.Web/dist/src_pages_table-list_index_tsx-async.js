((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['src/pages/table-list/index.tsx'],
{ "src/pages/table-list/components/CreateForm.tsx": function (module, exports, __mako_require__){
"use strict";
__mako_require__.d(exports, "__esModule", {
    value: true
});
__mako_require__.d(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _jsxdevruntime = __mako_require__("node_modules/react/jsx-dev-runtime.js");
var _icons = __mako_require__("node_modules/@ant-design/icons/es/index.js");
var _procomponents = __mako_require__("node_modules/@ant-design/pro-components/es/index.js");
var _max = __mako_require__("src/.umi/exports.ts");
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _api = __mako_require__("src/services/ant-design-pro/api.ts");
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
const CreateForm = (props)=>{
    _s();
    const { reload } = props;
    const [messageApi, contextHolder] = _antd.message.useMessage();
    /**
   * @en-US International configuration
   * @zh-CN 国际化配置
   * */ const intl = (0, _max.useIntl)();
    const { run, loading } = (0, _max.useRequest)(_api.addRule, {
        manual: true,
        onSuccess: ()=>{
            messageApi.success('Added successfully');
            reload === null || reload === void 0 || reload();
        },
        onError: ()=>{
            messageApi.error('Adding failed, please try again!');
        }
    });
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_jsxdevruntime.Fragment, {
        children: [
            contextHolder,
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ModalForm, {
                title: intl.formatMessage({
                    id: 'pages.searchTable.createForm.newRule',
                    defaultMessage: 'New rule'
                }),
                trigger: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                    type: "primary",
                    icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.PlusOutlined, {}, void 0, false, {
                        fileName: "src/pages/table-list/components/CreateForm.tsx",
                        lineNumber: 47,
                        columnNumber: 40
                    }, void 0),
                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                        id: "pages.searchTable.new",
                        defaultMessage: "New"
                    }, void 0, false, {
                        fileName: "src/pages/table-list/components/CreateForm.tsx",
                        lineNumber: 48,
                        columnNumber: 13
                    }, void 0)
                }, void 0, false, {
                    fileName: "src/pages/table-list/components/CreateForm.tsx",
                    lineNumber: 47,
                    columnNumber: 11
                }, void 0),
                width: "400px",
                modalProps: {
                    okButtonProps: {
                        loading
                    }
                },
                onFinish: async (value)=>{
                    await run({
                        data: value
                    });
                    return true;
                },
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormText, {
                        rules: [
                            {
                                required: true,
                                message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                    id: "pages.searchTable.ruleName",
                                    defaultMessage: "Rule name is required"
                                }, void 0, false, {
                                    fileName: "src/pages/table-list/components/CreateForm.tsx",
                                    lineNumber: 64,
                                    columnNumber: 17
                                }, void 0)
                            }
                        ],
                        width: "md",
                        name: "name"
                    }, void 0, false, {
                        fileName: "src/pages/table-list/components/CreateForm.tsx",
                        lineNumber: 59,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormTextArea, {
                        width: "md",
                        name: "desc"
                    }, void 0, false, {
                        fileName: "src/pages/table-list/components/CreateForm.tsx",
                        lineNumber: 74,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/table-list/components/CreateForm.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
};
_s(CreateForm, "6dQQXOLqS7/OoKBAiXI43hOlx50=", false, function() {
    return [
        _antd.message.useMessage,
        _max.useIntl,
        _max.useRequest
    ];
});
_c = CreateForm;
var _default = CreateForm;
var _c;
$RefreshReg$(_c, "CreateForm");
if (prevRefreshReg) self.$RefreshReg$ = prevRefreshReg;
if (prevRefreshSig) self.$RefreshSig$ = prevRefreshSig;
function registerClassComponent(filename, moduleExports) {
    for(const key in moduleExports)try {
        if (key === "__esModule") continue;
        const exportValue = moduleExports[key];
        if (_reactrefresh.isLikelyComponentType(exportValue) && exportValue.prototype && exportValue.prototype.isReactComponent) _reactrefresh.register(exportValue, filename + " " + key);
    } catch (e) {}
}
function $RefreshIsReactComponentLike$(moduleExports) {
    if (_reactrefresh.isLikelyComponentType(moduleExports || moduleExports.default)) return true;
    for(var key in moduleExports)try {
        if (_reactrefresh.isLikelyComponentType(moduleExports[key])) return true;
    } catch (e) {}
    return false;
}
registerClassComponent(module.id, module.exports);
if ($RefreshIsReactComponentLike$(module.exports)) {
    module.meta.hot.accept();
    _reactrefresh.performReactRefresh();
}

},
"src/pages/table-list/components/UpdateForm.tsx": function (module, exports, __mako_require__){
"use strict";
__mako_require__.d(exports, "__esModule", {
    value: true
});
__mako_require__.d(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _jsxdevruntime = __mako_require__("node_modules/react/jsx-dev-runtime.js");
var _procomponents = __mako_require__("node_modules/@ant-design/pro-components/es/index.js");
var _max = __mako_require__("src/.umi/exports.ts");
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _react = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react/index.js"));
var _api = __mako_require__("src/services/ant-design-pro/api.ts");
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
const UpdateForm = (props)=>{
    _s();
    const { onOk, values, trigger } = props;
    const intl = (0, _max.useIntl)();
    const [open, setOpen] = (0, _react.useState)(false);
    const [messageApi, contextHolder] = _antd.message.useMessage();
    const { run } = (0, _max.useRequest)(_api.updateRule, {
        manual: true,
        onSuccess: ()=>{
            messageApi.success('Configuration is successful');
            onOk === null || onOk === void 0 || onOk();
        },
        onError: ()=>{
            messageApi.error('Configuration failed, please try again!');
        }
    });
    const onCancel = (0, _react.useCallback)(()=>{
        setOpen(false);
    }, []);
    const onOpen = (0, _react.useCallback)(()=>{
        setOpen(true);
    }, []);
    const onFinish = (0, _react.useCallback)(async (values)=>{
        await run({
            data: values
        });
        onCancel();
    }, [
        onCancel,
        run
    ]);
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_jsxdevruntime.Fragment, {
        children: [
            contextHolder,
            trigger ? /*#__PURE__*/ (0, _react.cloneElement)(trigger, {
                onClick: onOpen
            }) : null,
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.StepsForm, {
                stepsProps: {
                    size: 'small'
                },
                stepsFormRender: (dom, submitter)=>{
                    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Modal, {
                        width: 640,
                        bodyStyle: {
                            padding: '32px 40px 48px'
                        },
                        destroyOnClose: true,
                        title: intl.formatMessage({
                            id: 'pages.searchTable.updateForm.ruleConfig',
                            defaultMessage: '规则配置'
                        }),
                        open: open,
                        footer: submitter,
                        onCancel: onCancel,
                        children: dom
                    }, void 0, false, {
                        fileName: "src/pages/table-list/components/UpdateForm.tsx",
                        lineNumber: 79,
                        columnNumber: 13
                    }, void 0);
                },
                onFinish: onFinish,
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.StepsForm.StepForm, {
                        initialValues: values,
                        title: intl.formatMessage({
                            id: 'pages.searchTable.updateForm.basicConfig',
                            defaultMessage: '基本信息'
                        }),
                        children: [
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormText, {
                                name: "name",
                                label: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.ruleName.nameLabel',
                                    defaultMessage: '规则名称'
                                }),
                                width: "md",
                                rules: [
                                    {
                                        required: true,
                                        message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                            id: "pages.searchTable.updateForm.ruleName.nameRules",
                                            defaultMessage: "请输入规则名称！"
                                        }, void 0, false, {
                                            fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                            lineNumber: 115,
                                            columnNumber: 19
                                        }, void 0)
                                    }
                                ]
                            }, void 0, false, {
                                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                lineNumber: 104,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormTextArea, {
                                name: "desc",
                                width: "md",
                                label: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.ruleDesc.descLabel',
                                    defaultMessage: '规则描述'
                                }),
                                placeholder: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.ruleDesc.descPlaceholder',
                                    defaultMessage: '请输入至少五个字符'
                                }),
                                rules: [
                                    {
                                        required: true,
                                        message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                            id: "pages.searchTable.updateForm.ruleDesc.descRules",
                                            defaultMessage: "请输入至少五个字符的规则描述！"
                                        }, void 0, false, {
                                            fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                            lineNumber: 138,
                                            columnNumber: 19
                                        }, void 0),
                                        min: 5
                                    }
                                ]
                            }, void 0, false, {
                                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                lineNumber: 123,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "src/pages/table-list/components/UpdateForm.tsx",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.StepsForm.StepForm, {
                        initialValues: {
                            target: '0',
                            template: '0'
                        },
                        title: intl.formatMessage({
                            id: 'pages.searchTable.updateForm.ruleProps.title',
                            defaultMessage: '配置规则属性'
                        }),
                        children: [
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormSelect, {
                                name: "target",
                                width: "md",
                                label: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.object',
                                    defaultMessage: '监控对象'
                                }),
                                valueEnum: {
                                    0: '表一',
                                    1: '表二'
                                }
                            }, void 0, false, {
                                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                lineNumber: 158,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormSelect, {
                                name: "template",
                                width: "md",
                                label: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.ruleProps.templateLabel',
                                    defaultMessage: '规则模板'
                                }),
                                valueEnum: {
                                    0: '规则模板一',
                                    1: '规则模板二'
                                }
                            }, void 0, false, {
                                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                lineNumber: 170,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormRadio.Group, {
                                name: "type",
                                label: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.ruleProps.typeLabel',
                                    defaultMessage: '规则类型'
                                }),
                                options: [
                                    {
                                        value: '0',
                                        label: '强'
                                    },
                                    {
                                        value: '1',
                                        label: '弱'
                                    }
                                ]
                            }, void 0, false, {
                                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                lineNumber: 182,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "src/pages/table-list/components/UpdateForm.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.StepsForm.StepForm, {
                        initialValues: {
                            type: '1',
                            frequency: 'month'
                        },
                        title: intl.formatMessage({
                            id: 'pages.searchTable.updateForm.schedulingPeriod.title',
                            defaultMessage: '设定调度周期'
                        }),
                        children: [
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormDateTimePicker, {
                                name: "time",
                                width: "md",
                                label: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.schedulingPeriod.timeLabel',
                                    defaultMessage: '开始时间'
                                }),
                                rules: [
                                    {
                                        required: true,
                                        message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                            id: "pages.searchTable.updateForm.schedulingPeriod.timeRules",
                                            defaultMessage: "请选择开始时间！"
                                        }, void 0, false, {
                                            fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                            lineNumber: 221,
                                            columnNumber: 19
                                        }, void 0)
                                    }
                                ]
                            }, void 0, false, {
                                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                lineNumber: 210,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormSelect, {
                                name: "frequency",
                                label: intl.formatMessage({
                                    id: 'pages.searchTable.updateForm.object',
                                    defaultMessage: '监控对象'
                                }),
                                width: "md",
                                valueEnum: {
                                    month: '月',
                                    week: '周'
                                }
                            }, void 0, false, {
                                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                                lineNumber: 229,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "src/pages/table-list/components/UpdateForm.tsx",
                        lineNumber: 200,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/table-list/components/UpdateForm.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
};
_s(UpdateForm, "yHzuBix6h3y2Ql+tlFe2Ai3LvKY=", false, function() {
    return [
        _max.useIntl,
        _antd.message.useMessage,
        _max.useRequest
    ];
});
_c = UpdateForm;
var _default = UpdateForm;
var _c;
$RefreshReg$(_c, "UpdateForm");
if (prevRefreshReg) self.$RefreshReg$ = prevRefreshReg;
if (prevRefreshSig) self.$RefreshSig$ = prevRefreshSig;
function registerClassComponent(filename, moduleExports) {
    for(const key in moduleExports)try {
        if (key === "__esModule") continue;
        const exportValue = moduleExports[key];
        if (_reactrefresh.isLikelyComponentType(exportValue) && exportValue.prototype && exportValue.prototype.isReactComponent) _reactrefresh.register(exportValue, filename + " " + key);
    } catch (e) {}
}
function $RefreshIsReactComponentLike$(moduleExports) {
    if (_reactrefresh.isLikelyComponentType(moduleExports || moduleExports.default)) return true;
    for(var key in moduleExports)try {
        if (_reactrefresh.isLikelyComponentType(moduleExports[key])) return true;
    } catch (e) {}
    return false;
}
registerClassComponent(module.id, module.exports);
if ($RefreshIsReactComponentLike$(module.exports)) {
    module.meta.hot.accept();
    _reactrefresh.performReactRefresh();
}

},
"src/pages/table-list/index.tsx": function (module, exports, __mako_require__){
"use strict";
__mako_require__.d(exports, "__esModule", {
    value: true
});
__mako_require__.d(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _interop_require_default = __mako_require__("@swc/helpers/_/_interop_require_default");
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _jsxdevruntime = __mako_require__("node_modules/react/jsx-dev-runtime.js");
var _procomponents = __mako_require__("node_modules/@ant-design/pro-components/es/index.js");
var _max = __mako_require__("src/.umi/exports.ts");
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _react = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react/index.js"));
var _api = __mako_require__("src/services/ant-design-pro/api.ts");
var _CreateForm = /*#__PURE__*/ _interop_require_default._(__mako_require__("src/pages/table-list/components/CreateForm.tsx"));
var _UpdateForm = /*#__PURE__*/ _interop_require_default._(__mako_require__("src/pages/table-list/components/UpdateForm.tsx"));
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
const TableList = ()=>{
    _s();
    const actionRef = (0, _react.useRef)(null);
    const [showDetail, setShowDetail] = (0, _react.useState)(false);
    const [currentRow, setCurrentRow] = (0, _react.useState)();
    const [selectedRowsState, setSelectedRows] = (0, _react.useState)([]);
    /**
   * @en-US International configuration
   * @zh-CN 国际化配置
   * */ const intl = (0, _max.useIntl)();
    const [messageApi, contextHolder] = _antd.message.useMessage();
    const { run: delRun, loading } = (0, _max.useRequest)(_api.removeRule, {
        manual: true,
        onSuccess: ()=>{
            var _actionRef_current_reloadAndRest, _actionRef_current;
            setSelectedRows([]);
            (_actionRef_current = actionRef.current) === null || _actionRef_current === void 0 || (_actionRef_current_reloadAndRest = _actionRef_current.reloadAndRest) === null || _actionRef_current_reloadAndRest === void 0 || _actionRef_current_reloadAndRest.call(_actionRef_current);
            messageApi.success('Deleted successfully and will refresh soon');
        },
        onError: ()=>{
            messageApi.error('Delete failed, please try again');
        }
    });
    const columns = [
        {
            title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                id: "pages.searchTable.updateForm.ruleName.nameLabel",
                defaultMessage: "Rule name"
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 50,
                columnNumber: 9
            }, this),
            dataIndex: 'name',
            render: (dom, entity)=>{
                return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("a", {
                    onClick: ()=>{
                        setCurrentRow(entity);
                        setShowDetail(true);
                    },
                    children: dom
                }, void 0, false, {
                    fileName: "src/pages/table-list/index.tsx",
                    lineNumber: 58,
                    columnNumber: 11
                }, this);
            }
        },
        {
            title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                id: "pages.searchTable.titleDesc",
                defaultMessage: "Description"
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 71,
                columnNumber: 9
            }, this),
            dataIndex: 'desc',
            valueType: 'textarea'
        },
        {
            title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                id: "pages.searchTable.titleCallNo",
                defaultMessage: "Number of service calls"
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 81,
                columnNumber: 9
            }, this),
            dataIndex: 'callNo',
            sorter: true,
            hideInForm: true,
            renderText: (val)=>`${val}${intl.formatMessage({
                    id: 'pages.searchTable.tenThousand',
                    defaultMessage: ' 万 '
                })}`
        },
        {
            title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                id: "pages.searchTable.titleStatus",
                defaultMessage: "Status"
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 97,
                columnNumber: 9
            }, this),
            dataIndex: 'status',
            hideInForm: true,
            valueEnum: {
                0: {
                    text: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                        id: "pages.searchTable.nameStatus.default",
                        defaultMessage: "Shut down"
                    }, void 0, false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 107,
                        columnNumber: 13
                    }, this),
                    status: 'Default'
                },
                1: {
                    text: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                        id: "pages.searchTable.nameStatus.running",
                        defaultMessage: "Running"
                    }, void 0, false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 116,
                        columnNumber: 13
                    }, this),
                    status: 'Processing'
                },
                2: {
                    text: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                        id: "pages.searchTable.nameStatus.online",
                        defaultMessage: "Online"
                    }, void 0, false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 125,
                        columnNumber: 13
                    }, this),
                    status: 'Success'
                },
                3: {
                    text: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                        id: "pages.searchTable.nameStatus.abnormal",
                        defaultMessage: "Abnormal"
                    }, void 0, false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 134,
                        columnNumber: 13
                    }, this),
                    status: 'Error'
                }
            }
        },
        {
            title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                id: "pages.searchTable.titleUpdatedAt",
                defaultMessage: "Last scheduled time"
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 145,
                columnNumber: 9
            }, this),
            sorter: true,
            dataIndex: 'updatedAt',
            valueType: 'dateTime',
            renderFormItem: (item, { defaultRender, ...rest }, form)=>{
                const status = form.getFieldValue('status');
                if (`${status}` === '0') return false;
                if (`${status}` === '3') return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Input, {
                    ...rest,
                    placeholder: intl.formatMessage({
                        id: 'pages.searchTable.exception',
                        defaultMessage: 'Please enter the reason for the exception!'
                    })
                }, void 0, false, {
                    fileName: "src/pages/table-list/index.tsx",
                    lineNumber: 160,
                    columnNumber: 13
                }, this);
                return defaultRender(item);
            }
        },
        {
            title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                id: "pages.searchTable.titleOption",
                defaultMessage: "Operating"
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 174,
                columnNumber: 9
            }, this),
            dataIndex: 'option',
            valueType: 'option',
            render: (_, record)=>{
                var _actionRef_current;
                return [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_UpdateForm.default, {
                        trigger: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("a", {
                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                id: "pages.searchTable.config",
                                defaultMessage: "Configuration"
                            }, void 0, false, {
                                fileName: "src/pages/table-list/index.tsx",
                                lineNumber: 185,
                                columnNumber: 15
                            }, void 0)
                        }, void 0, false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 184,
                            columnNumber: 13
                        }, void 0),
                        onOk: (_actionRef_current = actionRef.current) === null || _actionRef_current === void 0 ? void 0 : _actionRef_current.reload,
                        values: record
                    }, "config", false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 182,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("a", {
                        href: "https://procomponents.ant.design/",
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.searchTable.subscribeAlert",
                            defaultMessage: "Subscribe to alerts"
                        }, void 0, false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 196,
                            columnNumber: 11
                        }, this)
                    }, "subscribeAlert", false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 195,
                        columnNumber: 9
                    }, this)
                ];
            }
        }
    ];
    /**
   *  Delete node
   * @zh-CN 删除节点
   *
   * @param selectedRows
   */ const handleRemove = (0, _react.useCallback)(async (selectedRows)=>{
        if (!(selectedRows === null || selectedRows === void 0 ? void 0 : selectedRows.length)) {
            messageApi.warning('请选择删除项');
            return;
        }
        await delRun({
            data: {
                key: selectedRows.map((row)=>row.key)
            }
        });
    }, [
        delRun,
        messageApi.warning
    ]);
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.PageContainer, {
        children: [
            contextHolder,
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProTable, {
                headerTitle: intl.formatMessage({
                    id: 'pages.searchTable.title',
                    defaultMessage: 'Enquiry form'
                }),
                actionRef: actionRef,
                rowKey: "key",
                search: {
                    labelWidth: 120
                },
                toolBarRender: ()=>{
                    var _actionRef_current;
                    return [
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_CreateForm.default, {
                            reload: (_actionRef_current = actionRef.current) === null || _actionRef_current === void 0 ? void 0 : _actionRef_current.reload
                        }, "create", false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 242,
                            columnNumber: 11
                        }, void 0)
                    ];
                },
                request: _api.rule,
                columns: columns,
                rowSelection: {
                    onChange: (_, selectedRows)=>{
                        setSelectedRows(selectedRows);
                    }
                }
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this),
            (selectedRowsState === null || selectedRowsState === void 0 ? void 0 : selectedRowsState.length) > 0 && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.FooterToolbar, {
                extra: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                    children: [
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.searchTable.chosen",
                            defaultMessage: "Chosen"
                        }, void 0, false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 256,
                            columnNumber: 15
                        }, void 0),
                        ' ',
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("a", {
                            style: {
                                fontWeight: 600
                            },
                            children: selectedRowsState.length
                        }, void 0, false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 260,
                            columnNumber: 15
                        }, void 0),
                        ' ',
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.searchTable.item",
                            defaultMessage: "项"
                        }, void 0, false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 261,
                            columnNumber: 15
                        }, void 0),
                        "  ",
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                    id: "pages.searchTable.totalServiceCalls",
                                    defaultMessage: "Total number of service calls"
                                }, void 0, false, {
                                    fileName: "src/pages/table-list/index.tsx",
                                    lineNumber: 267,
                                    columnNumber: 17
                                }, void 0),
                                ' ',
                                selectedRowsState.reduce((pre, item)=>pre + (item.callNo ?? 0), 0),
                                ' ',
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                    id: "pages.searchTable.tenThousand",
                                    defaultMessage: "万"
                                }, void 0, false, {
                                    fileName: "src/pages/table-list/index.tsx",
                                    lineNumber: 275,
                                    columnNumber: 17
                                }, void 0)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 266,
                            columnNumber: 15
                        }, void 0)
                    ]
                }, void 0, true, {
                    fileName: "src/pages/table-list/index.tsx",
                    lineNumber: 255,
                    columnNumber: 13
                }, void 0),
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                        loading: loading,
                        onClick: ()=>{
                            handleRemove(selectedRowsState);
                        },
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.searchTable.batchDeletion",
                            defaultMessage: "Batch deletion"
                        }, void 0, false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 289,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 283,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                        type: "primary",
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.searchTable.batchApproval",
                            defaultMessage: "Batch approval"
                        }, void 0, false, {
                            fileName: "src/pages/table-list/index.tsx",
                            lineNumber: 295,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/table-list/index.tsx",
                        lineNumber: 294,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 253,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Drawer, {
                width: 600,
                open: showDetail,
                onClose: ()=>{
                    setCurrentRow(undefined);
                    setShowDetail(false);
                },
                closable: false,
                children: (currentRow === null || currentRow === void 0 ? void 0 : currentRow.name) && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProDescriptions, {
                    column: 2,
                    title: currentRow === null || currentRow === void 0 ? void 0 : currentRow.name,
                    request: async ()=>({
                            data: currentRow || {}
                        }),
                    params: {
                        id: currentRow === null || currentRow === void 0 ? void 0 : currentRow.name
                    },
                    columns: columns
                }, void 0, false, {
                    fileName: "src/pages/table-list/index.tsx",
                    lineNumber: 313,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "src/pages/table-list/index.tsx",
                lineNumber: 303,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "src/pages/table-list/index.tsx",
        lineNumber: 229,
        columnNumber: 5
    }, this);
};
_s(TableList, "oGV73pAxzEGYbRwrW8I7V3rA6Lk=", false, function() {
    return [
        _max.useIntl,
        _antd.message.useMessage,
        _max.useRequest
    ];
});
_c = TableList;
var _default = TableList;
var _c;
$RefreshReg$(_c, "TableList");
if (prevRefreshReg) self.$RefreshReg$ = prevRefreshReg;
if (prevRefreshSig) self.$RefreshSig$ = prevRefreshSig;
function registerClassComponent(filename, moduleExports) {
    for(const key in moduleExports)try {
        if (key === "__esModule") continue;
        const exportValue = moduleExports[key];
        if (_reactrefresh.isLikelyComponentType(exportValue) && exportValue.prototype && exportValue.prototype.isReactComponent) _reactrefresh.register(exportValue, filename + " " + key);
    } catch (e) {}
}
function $RefreshIsReactComponentLike$(moduleExports) {
    if (_reactrefresh.isLikelyComponentType(moduleExports || moduleExports.default)) return true;
    for(var key in moduleExports)try {
        if (_reactrefresh.isLikelyComponentType(moduleExports[key])) return true;
    } catch (e) {}
    return false;
}
registerClassComponent(module.id, module.exports);
if ($RefreshIsReactComponentLike$(module.exports)) {
    module.meta.hot.accept();
    _reactrefresh.performReactRefresh();
}

},
 }]);
//# sourceMappingURL=src_pages_table-list_index_tsx-async.js.map