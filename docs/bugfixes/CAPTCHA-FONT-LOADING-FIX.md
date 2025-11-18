# 验证码字体文件加载问题修复

## 问题描述

在 Docker 容器中运行时，验证码服务无法加载字体文件，报错：
```
SixLabors.Fonts.InvalidFontTableException: Table 'name' is missing
```

虽然字体文件在 Docker 容器中存在，但加载失败，说明字体文件可能：
1. **文件权限问题**（最常见）- 文件没有读取权限
2. 文件损坏或不完整
3. 文件格式不正确
4. 文件下载不完整

## 解决方案

### 1. 检查字体文件和权限

在 Docker 容器中检查字体文件：

```bash
# 进入容器
docker exec -it <container_name> sh

# 检查文件是否存在和权限
ls -lh /app/Fonts/DejaVuSans-Bold.ttf

# 检查文件权限（应该显示 -rw-r--r-- 或类似）
# 如果权限不正确，修复权限：
chmod 644 /app/Fonts/DejaVuSans-Bold.ttf

# 检查文件所有者（应该与运行应用的用户一致）
# 如果所有者不正确，修复所有者：
chown $(whoami) /app/Fonts/DejaVuSans-Bold.ttf

# 检查文件大小（正常应该大于 100KB）
stat /app/Fonts/DejaVuSans-Bold.ttf

# 检查文件类型
file /app/Fonts/DejaVuSans-Bold.ttf

# 测试文件是否可读
cat /app/Fonts/DejaVuSans-Bold.ttf > /dev/null && echo "文件可读" || echo "文件不可读"
```

### 2. 修复文件权限问题

如果文件权限不正确，在 Docker 容器中修复：

```bash
# 进入容器
docker exec -it <container_name> sh

# 修复字体文件权限
chmod 644 /app/Fonts/DejaVuSans-Bold.ttf

# 修复字体目录权限
chmod 755 /app/Fonts

# 如果需要，修复文件所有者（替换 <user> 为实际运行应用的用户）
chown <user>:<group> /app/Fonts/DejaVuSans-Bold.ttf
```

或者在 Dockerfile 中确保正确的权限：

```dockerfile
# 复制字体文件并设置权限
COPY --chmod=644 Fonts/DejaVuSans-Bold.ttf /app/Fonts/
```

### 3. 重新下载字体文件

如果文件损坏，需要重新下载：

```bash
# 在本地项目目录
cd Platform.ApiService/Fonts

# 删除旧文件
rm -f DejaVuSans-Bold.ttf

# 从官方源下载（推荐）
curl -L -o DejaVuSans-Bold.ttf "https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.tar.bz2" && \
tar -xjf dejavu-fonts-ttf-2.37.tar.bz2 && \
cp dejavu-fonts-ttf-2.37/ttf/DejaVuSans-Bold.ttf . && \
rm -rf dejavu-fonts-ttf-2.37*

# 或者从备用源下载
curl -L -o DejaVuSans-Bold.ttf "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Bold.ttf"

# 验证文件
file DejaVuSans-Bold.ttf
# 应该显示: DejaVuSans-Bold.ttf: TrueType font data
```

### 4. 验证字体文件完整性

代码已添加字体文件验证逻辑：

- **文件大小检查**：文件必须大于 1KB
- **文件格式检查**：检查 TTF/OTF 文件签名
- **详细错误日志**：记录文件路径、大小和错误类型

### 5. 代码改进

已添加以下改进：

1. **文件权限检查**：`CheckFileReadPermission()` 方法检查文件是否可读
2. **字体文件验证**：`ValidateFontFile()` 方法检查文件基本格式
3. **详细错误处理**：区分不同类型的错误（文件不存在、权限问题、格式错误、缺少字体表等）
4. **文件属性诊断**：`GetFileAttributes()` 方法记录文件权限、所有者等信息
5. **更好的日志记录**：记录文件路径、大小、权限和错误类型
6. **自动回退**：如果字体文件加载失败，自动使用系统字体

### 6. 验证修复

重新构建并运行后，检查日志：

```bash
# 查看日志，应该看到：
# [图形验证码] 成功加载字体文件: /app/Fonts/DejaVuSans-Bold.ttf, 文件大小: XXXXX bytes

# 或者如果失败：
# [图形验证码] 字体文件格式错误（缺少必要的字体表）: /app/Fonts/DejaVuSans-Bold.ttf。文件可能损坏或不完整，建议重新下载。
```

## 预防措施

1. **设置正确的文件权限**：在 Dockerfile 中使用 `--chmod=644` 确保字体文件可读
2. **在构建时验证字体文件**：确保字体文件在构建时就被正确包含
3. **使用正确的字体源**：从官方或可信源下载字体文件
4. **检查文件完整性**：下载后验证文件大小和格式
5. **Docker 构建时复制字体**：确保 Dockerfile 正确复制字体文件并设置权限

### Dockerfile 示例

```dockerfile
# 复制字体文件并设置权限
COPY --chmod=644 Fonts/DejaVuSans-Bold.ttf /app/Fonts/

# 或者使用 RUN 命令设置权限
RUN chmod 644 /app/Fonts/DejaVuSans-Bold.ttf
```

## 相关文件

- `Platform.ApiService/Services/ImageCaptchaService.cs` - 验证码服务实现
- `Platform.ApiService/Fonts/DejaVuSans-Bold.ttf` - 字体文件
- `Platform.ApiService/Platform.ApiService.csproj` - 项目配置（包含字体文件复制设置）

## 参考

- [DejaVu Fonts 官方仓库](https://github.com/dejavu-fonts/dejavu-fonts)
- [SixLabors.Fonts 文档](https://github.com/SixLabors/Fonts)

