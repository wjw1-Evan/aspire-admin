import component from './es-ES/component';
import globalHeader from './es-ES/globalHeader';
import menu from './es-ES/menu';
import pages from './es-ES/pages';
import pwa from './es-ES/pwa';
import settingDrawer from './es-ES/settingDrawer';
import settings from './es-ES/settings';
import request from './es-ES/request';

export default {
    'navBar.lang': 'Idiomas',
    'layout.user.link.help': 'Ayuda',
    'layout.user.link.privacy': 'Privacidad',
    'layout.user.link.terms': 'Términos',
    'app.preview.down.block': 'Descargar esta página a su proyecto local',
    'app.welcome.link.fetch-blocks': 'Obtener todos los bloques',
    'app.welcome.link.block-list':
        'Construya rápidamente páginas estándar basadas en el desarrollo de `block`',
    ...globalHeader,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...request,
    ...pages,
};
