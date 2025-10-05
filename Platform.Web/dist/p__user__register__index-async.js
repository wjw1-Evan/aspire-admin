((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__user__register__index'],
{ "src/pages/user/register/index.tsx": function (module, exports, __mako_require__){
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
var _icons = __mako_require__("node_modules/@ant-design/icons/es/index.js");
var _procomponents = __mako_require__("node_modules/@ant-design/pro-components/es/index.js");
var _max = __mako_require__("src/.umi/exports.ts");
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _antdstyle = __mako_require__("node_modules/antd-style/es/index.js");
var _react = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react/index.js"));
var _components = __mako_require__("src/components/index.ts");
var _api = __mako_require__("src/services/ant-design-pro/api.ts");
var _defaultSettings = /*#__PURE__*/ _interop_require_default._(__mako_require__("config/defaultSettings.ts"));
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
var _s1 = $RefreshSig$();
var _s2 = $RefreshSig$();
const useStyles = (0, _antdstyle.createStyles)(({ token })=>{
    return {
        action: {
            marginLeft: '8px',
            color: 'rgba(0, 0, 0, 0.2)',
            fontSize: '24px',
            verticalAlign: 'middle',
            cursor: 'pointer',
            transition: 'color 0.3s',
            '&:hover': {
                color: token.colorPrimaryActive
            }
        },
        lang: {
            width: 42,
            height: 42,
            lineHeight: '42px',
            position: 'fixed',
            right: 16,
            borderRadius: token.borderRadius,
            ':hover': {
                backgroundColor: token.colorBgTextHover
            }
        },
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'auto',
            backgroundImage: "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
            backgroundSize: '100% 100%'
        }
    };
});
const ActionIcons = ()=>{
    _s();
    const { styles } = useStyles();
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_jsxdevruntime.Fragment, {
        children: [
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.AlipayCircleOutlined, {
                className: styles.action
            }, "AlipayCircleOutlined", false, {
                fileName: "src/pages/user/register/index.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.TaobaoCircleOutlined, {
                className: styles.action
            }, "TaobaoCircleOutlined", false, {
                fileName: "src/pages/user/register/index.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.WeiboCircleOutlined, {
                className: styles.action
            }, "WeiboCircleOutlined", false, {
                fileName: "src/pages/user/register/index.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
};
_s(ActionIcons, "1BGFRu6BGAbhzJ8kKgs1GUjvI6w=", false, function() {
    return [
        useStyles
    ];
});
_c = ActionIcons;
const Lang = ()=>{
    _s1();
    const { styles } = useStyles();
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
        className: styles.lang,
        "data-lang": true,
        children: _max.SelectLang && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.SelectLang, {}, void 0, false, {
            fileName: "src/pages/user/register/index.tsx",
            lineNumber: 90,
            columnNumber: 22
        }, this)
    }, void 0, false, {
        fileName: "src/pages/user/register/index.tsx",
        lineNumber: 89,
        columnNumber: 5
    }, this);
};
_s1(Lang, "1BGFRu6BGAbhzJ8kKgs1GUjvI6w=", false, function() {
    return [
        useStyles
    ];
});
_c1 = Lang;
const RegisterMessage = ({ content })=>{
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Alert, {
        style: {
            marginBottom: 24
        },
        message: content,
        type: "error",
        showIcon: true
    }, void 0, false, {
        fileName: "src/pages/user/register/index.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, this);
};
_c2 = RegisterMessage;
const Register = ()=>{
    _s2();
    const [registerState, setRegisterState] = (0, _react.useState)({});
    const { styles } = useStyles();
    const { message } = _antd.App.useApp();
    const intl = (0, _max.useIntl)();
    const handleSubmit = async (values)=>{
        try {
            // 注册
            const result = await (0, _api.register)(values);
            if (result.success) {
                const defaultRegisterSuccessMessage = intl.formatMessage({
                    id: 'pages.register.success',
                    defaultMessage: '注册成功！'
                });
                message.success(defaultRegisterSuccessMessage);
                // 注册成功后跳转到注册结果页面
                _max.history.push('/user/register-result');
                return;
            }
            // 如果失败去设置用户错误信息
            setRegisterState(result);
        } catch (error) {
            const defaultRegisterFailureMessage = intl.formatMessage({
                id: 'pages.register.failure',
                defaultMessage: '注册失败，请重试！'
            });
            console.log(error);
            message.error(defaultRegisterFailureMessage);
        }
    };
    const { errorCode, errorMessage } = registerState;
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
        className: styles.container,
        children: [
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.Helmet, {
                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("title", {
                    children: [
                        intl.formatMessage({
                            id: 'menu.register',
                            defaultMessage: '注册页'
                        }),
                        _defaultSettings.default.title && ` - ${_defaultSettings.default.title}`
                    ]
                }, void 0, true, {
                    fileName: "src/pages/user/register/index.tsx",
                    lineNumber: 149,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "src/pages/user/register/index.tsx",
                lineNumber: 148,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Lang, {}, void 0, false, {
                fileName: "src/pages/user/register/index.tsx",
                lineNumber: 157,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                style: {
                    flex: '1',
                    padding: '32px 0'
                },
                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.LoginForm, {
                    contentStyle: {
                        minWidth: 280,
                        maxWidth: '75vw'
                    },
                    logo: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("img", {
                        alt: "logo",
                        src: "/logo.svg"
                    }, void 0, false, {
                        fileName: "src/pages/user/register/index.tsx",
                        lineNumber: 169,
                        columnNumber: 17
                    }, void 0),
                    title: "Ant Design",
                    subTitle: intl.formatMessage({
                        id: 'pages.layouts.userLayout.title'
                    }),
                    actions: [
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.register.registerWith",
                            defaultMessage: "其他注册方式"
                        }, "registerWith", false, {
                            fileName: "src/pages/user/register/index.tsx",
                            lineNumber: 175,
                            columnNumber: 13
                        }, void 0),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(ActionIcons, {}, "icons", false, {
                            fileName: "src/pages/user/register/index.tsx",
                            lineNumber: 180,
                            columnNumber: 13
                        }, void 0)
                    ],
                    onFinish: async (values)=>{
                        await handleSubmit(values);
                    },
                    submitter: {
                        searchConfig: {
                            submitText: intl.formatMessage({
                                id: 'pages.register.submit',
                                defaultMessage: '注册'
                            })
                        }
                    },
                    children: [
                        errorCode && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(RegisterMessage, {
                            content: errorMessage || '注册失败'
                        }, void 0, false, {
                            fileName: "src/pages/user/register/index.tsx",
                            lineNumber: 195,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormText, {
                            name: "username",
                            fieldProps: {
                                size: 'large',
                                prefix: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.UserOutlined, {}, void 0, false, {
                                    fileName: "src/pages/user/register/index.tsx",
                                    lineNumber: 202,
                                    columnNumber: 23
                                }, void 0)
                            },
                            placeholder: intl.formatMessage({
                                id: 'pages.register.username.placeholder',
                                defaultMessage: '用户名'
                            }),
                            rules: [
                                {
                                    required: true,
                                    message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                        id: "pages.register.username.required",
                                        defaultMessage: "请输入用户名!"
                                    }, void 0, false, {
                                        fileName: "src/pages/user/register/index.tsx",
                                        lineNumber: 212,
                                        columnNumber: 19
                                    }, void 0)
                                },
                                {
                                    min: 3,
                                    max: 20,
                                    message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                        id: "pages.register.username.length",
                                        defaultMessage: "用户名长度必须在3-20个字符之间"
                                    }, void 0, false, {
                                        fileName: "src/pages/user/register/index.tsx",
                                        lineNumber: 222,
                                        columnNumber: 19
                                    }, void 0)
                                }
                            ]
                        }, void 0, false, {
                            fileName: "src/pages/user/register/index.tsx",
                            lineNumber: 198,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormText.Password, {
                            name: "password",
                            fieldProps: {
                                size: 'large',
                                prefix: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.LockOutlined, {}, void 0, false, {
                                    fileName: "src/pages/user/register/index.tsx",
                                    lineNumber: 235,
                                    columnNumber: 23
                                }, void 0)
                            },
                            placeholder: intl.formatMessage({
                                id: 'pages.register.password.placeholder',
                                defaultMessage: '密码'
                            }),
                            rules: [
                                {
                                    required: true,
                                    message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                        id: "pages.register.password.required",
                                        defaultMessage: "请输入密码！"
                                    }, void 0, false, {
                                        fileName: "src/pages/user/register/index.tsx",
                                        lineNumber: 245,
                                        columnNumber: 19
                                    }, void 0)
                                },
                                {
                                    min: 6,
                                    message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                        id: "pages.register.password.length",
                                        defaultMessage: "密码长度至少6个字符"
                                    }, void 0, false, {
                                        fileName: "src/pages/user/register/index.tsx",
                                        lineNumber: 254,
                                        columnNumber: 19
                                    }, void 0)
                                }
                            ]
                        }, void 0, false, {
                            fileName: "src/pages/user/register/index.tsx",
                            lineNumber: 231,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProFormText, {
                            name: "email",
                            fieldProps: {
                                size: 'large',
                                prefix: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.MailOutlined, {}, void 0, false, {
                                    fileName: "src/pages/user/register/index.tsx",
                                    lineNumber: 267,
                                    columnNumber: 23
                                }, void 0)
                            },
                            placeholder: intl.formatMessage({
                                id: 'pages.register.email.placeholder',
                                defaultMessage: '邮箱（可选）'
                            }),
                            rules: [
                                {
                                    type: 'email',
                                    message: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                        id: "pages.register.email.invalid",
                                        defaultMessage: "邮箱格式不正确！"
                                    }, void 0, false, {
                                        fileName: "src/pages/user/register/index.tsx",
                                        lineNumber: 277,
                                        columnNumber: 19
                                    }, void 0)
                                }
                            ]
                        }, void 0, false, {
                            fileName: "src/pages/user/register/index.tsx",
                            lineNumber: 263,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                            style: {
                                marginBottom: 24,
                                textAlign: 'center'
                            },
                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.Link, {
                                to: "/user/login",
                                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                                    id: "pages.register.backToLogin",
                                    defaultMessage: "已有账号？立即登录"
                                }, void 0, false, {
                                    fileName: "src/pages/user/register/index.tsx",
                                    lineNumber: 293,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "src/pages/user/register/index.tsx",
                                lineNumber: 292,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "src/pages/user/register/index.tsx",
                            lineNumber: 286,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "src/pages/user/register/index.tsx",
                    lineNumber: 164,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "src/pages/user/register/index.tsx",
                lineNumber: 158,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_components.Footer, {}, void 0, false, {
                fileName: "src/pages/user/register/index.tsx",
                lineNumber: 301,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "src/pages/user/register/index.tsx",
        lineNumber: 147,
        columnNumber: 5
    }, this);
};
_s2(Register, "v0B8uY5iNgnePmVNr/l8HCTJ+vs=", false, function() {
    return [
        useStyles,
        _antd.App.useApp,
        _max.useIntl
    ];
});
_c3 = Register;
var _default = Register;
var _c;
var _c1;
var _c2;
var _c3;
$RefreshReg$(_c, "ActionIcons");
$RefreshReg$(_c1, "Lang");
$RefreshReg$(_c2, "RegisterMessage");
$RefreshReg$(_c3, "Register");
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
//# sourceMappingURL=p__user__register__index-async.js.map