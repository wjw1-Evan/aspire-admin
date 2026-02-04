import component from './de-DE/component';
import globalHeader from './de-DE/globalHeader';
import menu from './de-DE/menu';
import pages from './de-DE/pages';
import pwa from './de-DE/pwa';
import settingDrawer from './de-DE/settingDrawer';
import settings from './de-DE/settings';
import request from './de-DE/request';

export default {
    'navBar.lang': 'Sprachen',
    'layout.user.link.help': 'Hilfe',
    'layout.user.link.privacy': 'Datenschutz',
    'layout.user.link.terms': 'Nutzungsbedingungen',
    'app.preview.down.block': 'Diese Seite in Ihr lokales Projekt herunterladen',
    'app.welcome.link.fetch-blocks': 'Alle Blöcke abrufen',
    'app.welcome.link.block-list':
        'Erstellen Sie schnell Standardseiten basierend auf der `block`-Entwicklung',
    ...globalHeader,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...request,
    ...pages,
};
