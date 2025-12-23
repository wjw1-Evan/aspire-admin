# Aspire Admin — VS Code 工作区规则说明

本文件由仓库内 `.cursor/rules` 自动整理：将可映射到 VS Code 的设置写入了 `.vscode/settings.json`，不可自动转换的团队约定整理在本说明里，便于团队在编辑器中查看和遵守。

## 已在 `.vscode/settings.json` 中启用（自动/可生效）
- 文件/搜索排除：自动隐藏 `bin/`、`obj/`、`node_modules/`、`.expo/`、`aspire-output/`、`dist/`、`coverage/` 和 `.cursor` 目录（可减少文件列表/搜索噪音）。
- 格式化：启用 `editor.formatOnSave`，并将 Prettier 指定为 JS/TS/JSON 的默认格式化器。
- 保存时修复：启用 `source.fixAll.eslint`（需安装 ESLint 扩展并在项目中配置 ESLint）。

> 注意：上述行为依赖于推荐扩展（见下）以及项目内的 ESLint/Prettier 配置（若无请添加）。

## 推荐安装的扩展（已写入 `.vscode/extensions.json`）
- `ms-dotnettools.csharp`（C# 支持）
- `esbenp.prettier-vscode`（Prettier 格式化）
- `dbaeumer.vscode-eslint`（ESLint）
- `editorconfig.editorconfig`（读取 .editorconfig）
- `DavidAnson.vscode-markdownlint`（Markdown lint）
- `redhat.vscode-yaml`（YAML 支持与 schema）
- `eamodio.gitlens`（Git 增强）

## 团队约定（无法由 VS Code 直接强制，建议在 CI / pre-commit 钩子中实施）

1. 提交信息语言：所有 Git 提交必须使用简体中文，并遵循约定式提交格式（如 `feat: 添加用户管理功能`、`fix: 修复登录验证问题`）。建议通过 `commitlint` 与 `husky` 在本地/CI 强制。

2. 多租户与数据访问：后端代码不得直接注入/使用 `IMongoCollection<T>`/`IMongoDatabase`，必须通过 `IDatabaseOperationFactory<T>`。此类规则为架构约定，建议在代码评审与 CI 静态分析中检查相关惯用模式。

3. API 响应格式：统一返回 `ApiResponse<T>`，采用 camelCase、忽略 null、枚举为 camelCase 字符串。可在后端项目中加入集成测试或契约测试予以验证。

4. 权限/鉴权：后端使用 `[RequireMenu("menu-name")]`，前端不隐藏按钮，真实鉴权由后端判定。此为运行时/实现约束，建议文档/代码审查配合。

5. 前端规范（Platform.Admin / Platform.App）：项目中已有详细页面/组件规范（分页、DataTable、PageContainer 等），这些属于最佳实践与 UI 约束，请在 PR 模板中提醒审查者检查页面是否符合规范。

6. 审计/软删：创建/更新/删除必须通过工厂的原子方法，审计字段不得在业务代码中手动赋值。建议在代码审查中关注对工厂 API 的使用。

## 如何启用和验证
1. 在 VS Code 中打开工作区，点击弹出“推荐扩展”并安装上述扩展。
2. 确认项目根或 frontend 子项目中存在 ESLint/Prettier 配置（`.eslintrc.js` / `.prettierrc` 等）。若无，请与团队约定格式化规则并添加配置。
3. 若需强制提交信息或代码风格，请考虑添加：
   - Husky + lint-staged（Git 钩子）
   - commitlint（提交消息规则）
   - CI 检查（静态代码分析、集成测试）

### 快速安装（示例）
下面是在仓库根目录执行的示例步骤，会在根节点初始化必要的开发依赖并启用 husky 钩子。根据你的团队偏好，也可以在 `Platform.Admin` 子项目内单独安装并配置。

```bash
# 初始化（若已在根目录有 package.json 可跳过）
npm init -y

# 安装开发依赖（示例）
npm install -D prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-config-prettier husky lint-staged commitlint @commitlint/config-conventional

# 启用 husky
npx husky install

# 将现有 husky 脚本目录链接（我们已在仓库中添加了 .husky/* 脚本）
npx husky add .husky/pre-commit 'npx lint-staged' || true
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"' || true

# CI / 本地验证一次
npx lint-staged --debug
```

如果你希望我直接把这些依赖写入一个根 `package.json` 并运行安装（我可以生成文件和安装脚本，但无法在你的机器上执行安装），我可以为你准备一个建议的 `package.json` 更改补丁。

## 其它说明
- 本 README 摘自仓库 `.cursor/rules` 的核心要点，更多详细规则请阅读原文件：`.cursor/rules/00-global.mdc`、`.cursor/rules/backend.mdc`、`.cursor/rules/frontend-admin.mdc`、`.cursor/rules/frontend-app.mdc`。
- 需要我把其中某些约定进一步转为可执行的 CI/linters/hooks（例如 commitlint 或 ESLint 规则模板），回复我想要自动化的项，我会继续实现。

---
已生成：`.vscode/settings.json`、`.vscode/extensions.json` 与本文件。若需调整排除规则或格式化策略，我可以按需更新。
