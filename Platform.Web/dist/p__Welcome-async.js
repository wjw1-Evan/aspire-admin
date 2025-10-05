((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__Welcome'],
{ "src/pages/Welcome.tsx": function (module, exports, __mako_require__){
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
var _s1 = $RefreshSig$();
/**
 * 每个单独的卡片，为了复用样式抽成了组件
 * @param param0
 * @returns
 */ const InfoCard = ({ title, href, index, desc })=>{
    _s();
    const { useToken } = _antd.theme;
    const { token } = useToken();
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
        style: {
            backgroundColor: token.colorBgContainer,
            boxShadow: token.boxShadow,
            borderRadius: '8px',
            fontSize: '14px',
            color: token.colorTextSecondary,
            lineHeight: '22px',
            padding: '16px 19px',
            minWidth: '220px',
            flex: 1
        },
        children: [
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                style: {
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        style: {
                            width: 48,
                            height: 48,
                            lineHeight: '22px',
                            backgroundSize: '100%',
                            textAlign: 'center',
                            padding: '8px 16px 16px 12px',
                            color: '#FFF',
                            fontWeight: 'bold',
                            backgroundImage: "url('https://gw.alipayobjects.com/zos/bmw-prod/daaf8d50-8e6d-4251-905d-676a24ddfa12.svg')"
                        },
                        children: index
                    }, void 0, false, {
                        fileName: "src/pages/Welcome.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        style: {
                            fontSize: '16px',
                            color: token.colorText,
                            paddingBottom: 8
                        },
                        children: title
                    }, void 0, false, {
                        fileName: "src/pages/Welcome.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/Welcome.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                style: {
                    fontSize: '14px',
                    color: token.colorTextSecondary,
                    textAlign: 'justify',
                    lineHeight: '22px',
                    marginBottom: 8
                },
                children: desc
            }, void 0, false, {
                fileName: "src/pages/Welcome.tsx",
                lineNumber: 68,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("a", {
                href: href,
                target: "_blank",
                rel: "noreferrer",
                children: [
                    "了解更多 ",
                    '>'
                ]
            }, void 0, true, {
                fileName: "src/pages/Welcome.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "src/pages/Welcome.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
};
_s(InfoCard, "CXYXngGSy/ueZ8bUn1vgrdGvaEo=", true);
_c = InfoCard;
const Welcome = ()=>{
    var _initialState_settings;
    _s1();
    const { token } = _antd.theme.useToken();
    const { initialState } = (0, _max.useModel)('@@initialState');
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.PageContainer, {
        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Card, {
            style: {
                borderRadius: 8
            },
            styles: {
                body: {
                    backgroundImage: (initialState === null || initialState === void 0 ? void 0 : (_initialState_settings = initialState.settings) === null || _initialState_settings === void 0 ? void 0 : _initialState_settings.navTheme) === 'realDark' ? 'background-image: linear-gradient(75deg, #1A1B1F 0%, #191C1F 100%)' : 'background-image: linear-gradient(75deg, #FBFDFF 0%, #F5F7FF 100%)'
                }
            },
            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                style: {
                    backgroundPosition: '100% -30%',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '274px auto',
                    backgroundImage: "url('https://gw.alipayobjects.com/mdn/rms_a9745b/afts/img/A*BuFmQqsB2iAAAAAAAAAAAAAAARQnAQ')"
                },
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        style: {
                            fontSize: '20px',
                            color: token.colorTextHeading
                        },
                        children: "欢迎使用 Ant Design Pro"
                    }, void 0, false, {
                        fileName: "src/pages/Welcome.tsx",
                        lineNumber: 113,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                        style: {
                            fontSize: '14px',
                            color: token.colorTextSecondary,
                            lineHeight: '22px',
                            marginTop: 16,
                            marginBottom: 32,
                            width: '65%'
                        },
                        children: "Ant Design Pro 是一个整合了 umi，Ant Design 和 ProComponents 的脚手架方案。致力于在设计规范和基础组件的基础上，继续向上构建，提炼出典型模板/业务组件/配套设计资源，进一步提升企业级中后台产品设计研发过程中的『用户』和『设计者』的体验。"
                    }, void 0, false, {
                        fileName: "src/pages/Welcome.tsx",
                        lineNumber: 121,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 16
                        },
                        children: [
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(InfoCard, {
                                index: 1,
                                href: "https://umijs.org/docs/introduce/introduce",
                                title: "了解 umi",
                                desc: "umi 是一个可扩展的企业级前端应用框架,umi 以路由为基础的，同时支持配置式路由和约定式路由，保证路由的功能完备，并以此进行功能扩展。"
                            }, void 0, false, {
                                fileName: "src/pages/Welcome.tsx",
                                lineNumber: 141,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(InfoCard, {
                                index: 2,
                                title: "了解 ant design",
                                href: "https://ant.design",
                                desc: "antd 是基于 Ant Design 设计体系的 React UI 组件库，主要用于研发企业级中后台产品。"
                            }, void 0, false, {
                                fileName: "src/pages/Welcome.tsx",
                                lineNumber: 147,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(InfoCard, {
                                index: 3,
                                title: "了解 Pro Components",
                                href: "https://procomponents.ant.design",
                                desc: "ProComponents 是一个基于 Ant Design 做了更高抽象的模板组件，以 一个组件就是一个页面为开发理念，为中后台开发带来更好的体验。"
                            }, void 0, false, {
                                fileName: "src/pages/Welcome.tsx",
                                lineNumber: 153,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "src/pages/Welcome.tsx",
                        lineNumber: 134,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/Welcome.tsx",
                lineNumber: 104,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "src/pages/Welcome.tsx",
            lineNumber: 91,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "src/pages/Welcome.tsx",
        lineNumber: 90,
        columnNumber: 5
    }, this);
};
_s1(Welcome, "t4rumwICndEohNSyqYk3Pzlg18I=", false, function() {
    return [
        _antd.theme.useToken,
        _max.useModel
    ];
});
_c1 = Welcome;
var _default = Welcome;
var _c;
var _c1;
$RefreshReg$(_c, "InfoCard");
$RefreshReg$(_c1, "Welcome");
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
//# sourceMappingURL=p__Welcome-async.js.map