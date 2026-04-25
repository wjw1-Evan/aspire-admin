/**
 * 模块翻译统一导出入口 (bn-BD)
 * 
 * 目录结构:
 * - modules/    - 功能模块翻译
 * - common/     - 通用翻译
 * 
 * 包含模块: auth, user, task, project, workflow, document, company, help, other
 */

import common from './common/common';

import auth from './modules/auth';
import user from './modules/user';
import task from './modules/task';
import project from './modules/project';
import workflow from './modules/workflow';
import document from './modules/document';
import company from './modules/company';
import help from './modules/help';
import other from './modules/other';

// 导出所有模块
export { common };
export { auth, user, task, project, workflow, document, company, help, other };

// 默认导出：合并所有模块
export default {
  ...common,
  ...auth,
  ...user,
  ...task,
  ...project,
  ...workflow,
  ...document,
  ...company,
  ...help,
  ...other,
};
