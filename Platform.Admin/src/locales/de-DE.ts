import component from './de-DE/component';
import globalHeader from './de-DE/globalHeader';
import menu from './de-DE/menu';
import pages from './de-DE/pages';
import pwa from './de-DE/pwa';
import settingDrawer from './de-DE/settingDrawer';
import settings from './de-DE/settings';
import request from './de-DE/request';
import welcome from './de-DE/welcome';

import auth from './de-DE/modules/auth';
import cloudStorage from './de-DE/modules/cloud-storage';
import company from './de-DE/modules/company';
import dashboard from './de-DE/modules/dashboard';
import document from './de-DE/modules/document';
import help from './de-DE/modules/help';
import iot from './de-DE/modules/iot';
import missing from './de-DE/modules/missing';
import organization from './de-DE/modules/organization';
import other from './de-DE/modules/other';
import park from './de-DE/modules/park';
import project from './de-DE/modules/project';
import role from './de-DE/modules/role';
import task from './de-DE/modules/task';
import user from './de-DE/modules/user';
import webScraper from './de-DE/modules/web-scraper';
import workflow from './de-DE/modules/workflow';
import xiaoke from './de-DE/modules/xiaoke';

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
  ...welcome,

  ...auth,
  ...cloudStorage,
  ...company,
  ...dashboard,
  ...document,
  ...help,
  ...iot,
  ...missing,
  ...organization,
  ...other,
  ...park,
  ...project,
  ...role,
  ...task,
  ...user,
  ...webScraper,
  ...workflow,
  ...xiaoke,
};
