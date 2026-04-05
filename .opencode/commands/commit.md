# 自动提交命令

## 描述
修改代码成功后自动执行 Git 提交操作，确保代码变更被安全地提交到版本控制系统。

## 模板
开始工作前自动同步远程代码，提交变更时遵循约定式提交规范。

### 开始工作时
1. 自动拉取远程最新代码，确保本地与远程同步：
   ```
   git pull --rebase origin $(git branch --show-current)
   ```

2. 检查 Git 状态，查看有哪些文件被修改：
   ```
   git status
   ```

### 提交变更时
3. 查看具体的代码变更：
   ```
   git diff
   ```

4. 如果有变更需要提交：
   - 使用 `git add .` 将所有修改的文件添加到暂存区
   - 生成符合约定式提交规范的 commit message，格式为：
      - `feat: 添加xxx` - 新功能
      - `fix: 修复xxx` - 错误修复
      - `docs: 更新xxx` - 文档更新
      - `refactor: 重构xxx` - 代码重构
      - `style: 调整xxx` - 格式调整
      - `perf: 优化xxx` - 性能优化
      - `test: 测试xxx` - 测试相关
      - `chore: 维护xxx` - 构建或辅助工具的变动
     （commit message 应基于变更内容自动生成）
   - 执行 `git commit -m "提交信息"`

5. 推送变更到远程：
   ```
   git pull --rebase origin $(git branch --show-current) && git push origin $(git branch --show-current)
   ```

## 规则
- commit message 必须使用简体中文
- 提交信息应简洁明了，描述清楚改了什么
- 如果没有任何变更，不需要执行提交操作
- 自动拉取远程代码以避免冲突，但如果有冲突需手动解决
- 推送前先拉取远程变更，确保无冲突后再推送
