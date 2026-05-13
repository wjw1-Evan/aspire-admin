import component from './th-TH/component';
import globalHeader from './th-TH/globalHeader';
import menu from './th-TH/menu';
import auth from './th-TH/modules/auth';
import cloudStorage from './th-TH/modules/cloud-storage';
import company from './th-TH/modules/company';
import dashboard from './th-TH/modules/dashboard';
import document from './th-TH/modules/document';
import help from './th-TH/modules/help';
import iot from './th-TH/modules/iot';
import missing from './th-TH/modules/missing';
import organization from './th-TH/modules/organization';
import other from './th-TH/modules/other';
import park from './th-TH/modules/park';
import project from './th-TH/modules/project';
import role from './th-TH/modules/role';
import task from './th-TH/modules/task';
import user from './th-TH/modules/user';
import webScraper from './th-TH/modules/web-scraper';
import workflow from './th-TH/modules/workflow';
import xiaoke from './th-TH/modules/xiaoke';
import pages from './th-TH/pages';
import pwa from './th-TH/pwa';
import request from './th-TH/request';
import settingDrawer from './th-TH/settingDrawer';
import settings from './th-TH/settings';
import welcome from './th-TH/welcome';

export default {
  'navBar.lang': 'ภาษา',
  'layout.user.link.help': 'ช่วยเหลือ',
  'layout.user.link.privacy': 'ความเป็นส่วนตัว',
  'layout.user.link.terms': 'ข้อกำหนด',
  'app.preview.down.block': 'ดาวน์โหลดหน้านี้ไปยังโปรเจกต์ของคุณ',
  'app.welcome.link.fetch-blocks': 'รับบล็อกทั้งหมด',
  'app.welcome.link.block-list': 'สร้างหน้ามาตรฐานอย่างรวดเร็วตามการพัฒนา `block`',
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
