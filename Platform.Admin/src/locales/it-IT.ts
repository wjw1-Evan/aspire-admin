import component from './it-IT/component';
import globalHeader from './it-IT/globalHeader';
import menu from './it-IT/menu';
import pages from './it-IT/pages';
import pwa from './it-IT/pwa';
import settingDrawer from './it-IT/settingDrawer';
import settings from './it-IT/settings';
import request from './it-IT/request';

export default {
    'navBar.lang': 'Lingue',
    'layout.user.link.help': 'Aiuto',
    'layout.user.link.privacy': 'Privacy',
    'layout.user.link.terms': 'Termini',
    'app.preview.down.block': 'Scarica questa pagina nel tuo progetto locale',
    'app.welcome.link.fetch-blocks': 'Ottieni tutti i blocchi',
    'app.welcome.link.block-list':
        'Costruisci rapidamente pagine standard basate sullo sviluppo di `block`',
    ...globalHeader,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...request,
    ...pages,
};
