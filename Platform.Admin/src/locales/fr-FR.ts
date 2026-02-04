import component from './fr-FR/component';
import globalHeader from './fr-FR/globalHeader';
import menu from './fr-FR/menu';
import pages from './fr-FR/pages';
import pwa from './fr-FR/pwa';
import settingDrawer from './fr-FR/settingDrawer';
import settings from './fr-FR/settings';
import request from './fr-FR/request';

export default {
    'navBar.lang': 'Langues',
    'layout.user.link.help': 'Aide',
    'layout.user.link.privacy': 'Confidentialité',
    'layout.user.link.terms': 'Conditions',
    'app.preview.down.block': 'Télécharger cette page vers votre projet local',
    'app.welcome.link.fetch-blocks': 'Obtenir tous les blocs',
    'app.welcome.link.block-list':
        'Construisez rapidement des pages standard basées sur le développement de `block`',
    ...globalHeader,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...request,
    ...pages,
};
