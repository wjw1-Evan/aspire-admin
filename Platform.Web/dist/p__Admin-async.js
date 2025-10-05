((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__Admin'],
{ "src/pages/Admin.tsx": function (module, exports, __mako_require__){
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
const Admin = ()=>{
    _s();
    const intl = (0, _max.useIntl)();
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.PageContainer, {
        content: intl.formatMessage({
            id: 'pages.admin.subPage.title',
            defaultMessage: 'This page can only be viewed by admin'
        }),
        children: [
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Card, {
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Alert, {
                        message: intl.formatMessage({
                            id: 'pages.welcome.alertMessage',
                            defaultMessage: 'Faster and stronger heavy-duty components have been released.'
                        }),
                        type: "success",
                        showIcon: true,
                        banner: true,
                        style: {
                            margin: -12,
                            marginBottom: 48
                        }
                    }, void 0, false, {
                        fileName: "src/pages/Admin.tsx",
                        lineNumber: 17,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Typography.Title, {
                        level: 2,
                        style: {
                            textAlign: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.SmileTwoTone, {}, void 0, false, {
                                fileName: "src/pages/Admin.tsx",
                                lineNumber: 32,
                                columnNumber: 11
                            }, this),
                            " Ant Design Pro",
                            ' ',
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.HeartTwoTone, {
                                twoToneColor: "#eb2f96"
                            }, void 0, false, {
                                fileName: "src/pages/Admin.tsx",
                                lineNumber: 33,
                                columnNumber: 11
                            }, this),
                            " You"
                        ]
                    }, void 0, true, {
                        fileName: "src/pages/Admin.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/Admin.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                style: {
                    textAlign: 'center',
                    marginTop: 24
                },
                children: [
                    "Want to add more pages? Please refer to",
                    ' ',
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("a", {
                        href: "https://pro.ant.design/docs/block-cn",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        children: "use block"
                    }, void 0, false, {
                        fileName: "src/pages/Admin.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this),
                    "。"
                ]
            }, void 0, true, {
                fileName: "src/pages/Admin.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "src/pages/Admin.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
};
_s(Admin, "rlSgSjbewJ1PrR/Ile8g/kr050o=", false, function() {
    return [
        _max.useIntl
    ];
});
_c = Admin;
var _default = Admin;
var _c;
$RefreshReg$(_c, "Admin");
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
//# sourceMappingURL=p__Admin-async.js.map