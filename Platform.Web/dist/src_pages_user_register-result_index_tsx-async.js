((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['src/pages/user/register-result/index.tsx'],
{ "src/pages/user/register-result/index.tsx": function (module, exports, __mako_require__){
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
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _max = __mako_require__("src/.umi/exports.ts");
var _antdstyle = __mako_require__("node_modules/antd-style/es/index.js");
var _react = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/react/index.js"));
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
const useStyles = (0, _antdstyle.createStyles)(({ token })=>{
    return {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'auto',
            backgroundImage: "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
            backgroundSize: '100% 100%'
        },
        content: {
            flex: '1',
            padding: '32px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }
    };
});
const RegisterResult = ()=>{
    _s();
    const { styles } = useStyles();
    const intl = (0, _max.useIntl)();
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
        className: styles.container,
        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
            className: styles.content,
            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Result, {
                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.CheckCircleOutlined, {
                    style: {
                        color: '#52c41a'
                    }
                }, void 0, false, {
                    fileName: "src/pages/user/register-result/index.tsx",
                    lineNumber: 36,
                    columnNumber: 17
                }, void 0),
                title: intl.formatMessage({
                    id: 'pages.register.result.title',
                    defaultMessage: '注册成功'
                }),
                subTitle: intl.formatMessage({
                    id: 'pages.register.result.subtitle',
                    defaultMessage: '恭喜您，账号注册成功！'
                }),
                extra: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                        type: "primary",
                        onClick: ()=>{
                            _max.history.push('/user/login');
                        },
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.register.result.login",
                            defaultMessage: "立即登录"
                        }, void 0, false, {
                            fileName: "src/pages/user/register-result/index.tsx",
                            lineNumber: 53,
                            columnNumber: 15
                        }, void 0)
                    }, "login", false, {
                        fileName: "src/pages/user/register-result/index.tsx",
                        lineNumber: 46,
                        columnNumber: 13
                    }, void 0),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                        onClick: ()=>{
                            _max.history.push('/');
                        },
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_max.FormattedMessage, {
                            id: "pages.register.result.home",
                            defaultMessage: "返回首页"
                        }, void 0, false, {
                            fileName: "src/pages/user/register-result/index.tsx",
                            lineNumber: 64,
                            columnNumber: 15
                        }, void 0)
                    }, "home", false, {
                        fileName: "src/pages/user/register-result/index.tsx",
                        lineNumber: 58,
                        columnNumber: 13
                    }, void 0)
                ]
            }, void 0, false, {
                fileName: "src/pages/user/register-result/index.tsx",
                lineNumber: 35,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "src/pages/user/register-result/index.tsx",
            lineNumber: 34,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "src/pages/user/register-result/index.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
};
_s(RegisterResult, "OjJ+EllAvksx/JBYcwLswiJQH8M=", false, function() {
    return [
        useStyles,
        _max.useIntl
    ];
});
_c = RegisterResult;
var _default = RegisterResult;
var _c;
$RefreshReg$(_c, "RegisterResult");
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
//# sourceMappingURL=src_pages_user_register-result_index_tsx-async.js.map