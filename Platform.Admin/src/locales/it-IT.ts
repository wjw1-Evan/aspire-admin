import component from './it-IT/component';
import globalHeader from './it-IT/globalHeader';
import menu from './it-IT/menu';
import auth from './it-IT/modules/auth';
import cloudStorage from './it-IT/modules/cloud-storage';
import company from './it-IT/modules/company';
import dashboard from './it-IT/modules/dashboard';
import document from './it-IT/modules/document';
import help from './it-IT/modules/help';
import iot from './it-IT/modules/iot';
import missing from './it-IT/modules/missing';
import organization from './it-IT/modules/organization';
import other from './it-IT/modules/other';
import park from './it-IT/modules/park';
import project from './it-IT/modules/project';
import role from './it-IT/modules/role';
import task from './it-IT/modules/task';
import user from './it-IT/modules/user';
import webScraper from './it-IT/modules/web-scraper';
import workflow from './it-IT/modules/workflow';
import xiaoke from './it-IT/modules/xiaoke';
import pages from './it-IT/pages';
import pwa from './it-IT/pwa';
import request from './it-IT/request';
import settingDrawer from './it-IT/settingDrawer';
import settings from './it-IT/settings';
import welcome from './it-IT/welcome';

export default {
  'navBar.lang': 'Lingue',
  'layout.user.link.help': 'Aiuto',
  'layout.user.link.privacy': 'Privacy',
  'layout.user.link.terms': 'Termini',
  'app.preview.down.block': 'Scarica questa pagina nel tuo progetto locale',
  'app.welcome.link.fetch-blocks': 'Ottieni tutti i blocchi',
  'app.welcome.link.block-list': 'Costruisci rapidamente pagine standard basate sullo sviluppo di `block`',
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
