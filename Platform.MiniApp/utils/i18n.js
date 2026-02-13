const zhCN = {
    'settings.title': '通用设置',
    'settings.language': '多语言',
    'settings.language.chinese': '简体中文',
    'settings.language.english': 'English',
    'settings.cache': '清理缓存',
    'settings.cache.msg': '确定要清理本地缓存吗？',
    'settings.cache.success': '清理成功',
    'settings.about': '关于系统',
    'settings.version': '版本信息',
    'settings.theme': '主题模式',
    'settings.theme.light': '浅色',
    'settings.theme.dark': '深色',
    'common.confirm': '确定',
    'common.cancel': '取消',
    'common.tips': '提示',
    'common.loading': '加载中...',
    'profile.title': '个人中心',
    'profile.account': '账户设置',
    'profile.security': '安全中心',
    'profile.logout': '退出当前账号',
    'profile.logout.confirm': '确定要退出登录吗？'
};

const enUS = {
    'settings.title': 'General Settings',
    'settings.language': 'Language',
    'settings.language.chinese': '简体中文',
    'settings.language.english': 'English',
    'settings.cache': 'Clear Cache',
    'settings.cache.msg': 'Are you sure you want to clear the local cache?',
    'settings.cache.success': 'Cache cleared',
    'settings.about': 'About Us',
    'settings.version': 'Version',
    'settings.theme': 'Theme Mode',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.tips': 'Tips',
    'common.loading': 'Loading...',
    'profile.title': 'Profile',
    'profile.account': 'Account Settings',
    'profile.security': 'Security',
    'profile.logout': 'Logout',
    'profile.logout.confirm': 'Are you sure you want to logout?'
};

let currentLocale = wx.getStorageSync('locale') || 'zh-CN';
const locales = {
    'zh-CN': zhCN,
    'en-US': enUS
};

const t = (key) => {
    return locales[currentLocale][key] || key;
};

const setLocale = (locale) => {
    if (locales[locale]) {
        currentLocale = locale;
        wx.setStorageSync('locale', locale);
        return true;
    }
    return false;
};

const getLocale = () => currentLocale;

module.exports = {
    t,
    setLocale,
    getLocale
};
