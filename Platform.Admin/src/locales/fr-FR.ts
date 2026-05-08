import component from './fr-FR/component';
import globalHeader from './fr-FR/globalHeader';
import menu from './fr-FR/menu';
import pages from './fr-FR/pages';
import pwa from './fr-FR/pwa';
import settingDrawer from './fr-FR/settingDrawer';
import settings from './fr-FR/settings';
import request from './fr-FR/request';
import welcome from './fr-FR/welcome';

import auth from './fr-FR/modules/auth';
import cloudStorage from './fr-FR/modules/cloud-storage';
import company from './fr-FR/modules/company';
import dashboard from './fr-FR/modules/dashboard';
import document from './fr-FR/modules/document';
import help from './fr-FR/modules/help';
import iot from './fr-FR/modules/iot';
import missing from './fr-FR/modules/missing';
import organization from './fr-FR/modules/organization';
import other from './fr-FR/modules/other';
import park from './fr-FR/modules/park';
import project from './fr-FR/modules/project';
import role from './fr-FR/modules/role';
import task from './fr-FR/modules/task';
import user from './fr-FR/modules/user';
import webScraper from './fr-FR/modules/web-scraper';
import workflow from './fr-FR/modules/workflow';
import xiaoke from './fr-FR/modules/xiaoke';

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
