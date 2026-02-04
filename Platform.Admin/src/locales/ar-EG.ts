import component from './ar-EG/component';
import globalHeader from './ar-EG/globalHeader';
import menu from './ar-EG/menu';
import pages from './ar-EG/pages';
import pwa from './ar-EG/pwa';
import settingDrawer from './ar-EG/settingDrawer';
import settings from './ar-EG/settings';
import request from './ar-EG/request';

export default {
    'navBar.lang': 'اللغات',
    'layout.user.link.help': 'مساعدة',
    'layout.user.link.privacy': 'الخصوصية',
    'layout.user.link.terms': 'الشروط',
    'app.preview.down.block': 'تحميل هذه الصفحة إلى مشروعك المحلي',
    'app.welcome.link.fetch-blocks': 'الحصول على جميع الكتل',
    'app.welcome.link.block-list':
        'بناء صفحات قياسية بسرعة بناءً على تطوير `block`',
    ...globalHeader,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...request,
    ...pages,
};
