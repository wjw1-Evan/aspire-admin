import component from './id-ID/component';
import globalHeader from './id-ID/globalHeader';
import menu from './id-ID/menu';
import auth from './id-ID/modules/auth';
import cloudStorage from './id-ID/modules/cloud-storage';
import company from './id-ID/modules/company';
import dashboard from './id-ID/modules/dashboard';
import document from './id-ID/modules/document';
import help from './id-ID/modules/help';
import iot from './id-ID/modules/iot';
import missing from './id-ID/modules/missing';
import organization from './id-ID/modules/organization';
import other from './id-ID/modules/other';
import park from './id-ID/modules/park';
import project from './id-ID/modules/project';
import role from './id-ID/modules/role';
import task from './id-ID/modules/task';
import user from './id-ID/modules/user';
import webScraper from './id-ID/modules/web-scraper';
import workflow from './id-ID/modules/workflow';
import xiaoke from './id-ID/modules/xiaoke';
import pages from './id-ID/pages';
import pwa from './id-ID/pwa';
import settingDrawer from './id-ID/settingDrawer';
import settings from './id-ID/settings';
import welcome from './id-ID/welcome';

export default {
  'navbar.lang': 'Bahasa',
  'layout.user.link.help': 'Bantuan',
  'layout.user.link.privacy': 'Privasi',
  'layout.user.link.terms': 'Ketentuan',
  'app.preview.down.block': 'Unduh halaman ini dalam projek lokal anda',
  'app.welcome.link.fetch-blocks': 'Dapatkan semua blok',
  'app.welcome.link.block-list': 'Buat standar dengan cepat, halaman-halaman berdasarkan pengembangan `block`',
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
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
