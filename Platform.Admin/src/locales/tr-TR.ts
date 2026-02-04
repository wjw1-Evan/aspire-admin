import component from './tr-TR/component';
import globalHeader from './tr-TR/globalHeader';
import menu from './tr-TR/menu';
import pages from './tr-TR/pages';
import pwa from './tr-TR/pwa';
import settingDrawer from './tr-TR/settingDrawer';
import settings from './tr-TR/settings';
import request from './tr-TR/request';

export default {
    'navBar.lang': 'Diller',
    'layout.user.link.help': 'Yardım',
    'layout.user.link.privacy': 'Gizlilik',
    'layout.user.link.terms': 'Şartlar',
    'app.preview.down.block': 'Bu sayfayı yerel projenize indirin',
    'app.welcome.link.fetch-blocks': 'Tüm blokları al',
    'app.welcome.link.block-list':
        '`block` geliştirmesine dayalı olarak hızlıca standart sayfalar oluşturun',
    ...globalHeader,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...request,
    ...pages,
};
