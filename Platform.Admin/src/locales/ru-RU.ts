import component from './ru-RU/component';
import globalHeader from './ru-RU/globalHeader';
import menu from './ru-RU/menu';
import pages from './ru-RU/pages';
import pwa from './ru-RU/pwa';
import settingDrawer from './ru-RU/settingDrawer';
import settings from './ru-RU/settings';
import request from './ru-RU/request';

export default {
    'navBar.lang': 'Языки',
    'layout.user.link.help': 'Помощь',
    'layout.user.link.privacy': 'Конфиденциальность',
    'layout.user.link.terms': 'Условия',
    'app.preview.down.block': 'Скачать эту страницу в локальный проект',
    'app.welcome.link.fetch-blocks': 'Получить все блоки',
    'app.welcome.link.block-list':
        'Быстро создавайте стандартные страницы на основе разработки `block`',
    ...globalHeader,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...request,
    ...pages,
};
