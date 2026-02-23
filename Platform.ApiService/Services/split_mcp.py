import os
import sys

base_path = "/Users/fanshuyi/Projects/aspire-admin/Platform.ApiService/Services/"
mcp_file_path = os.path.join(base_path, "McpService.cs")

with open(mcp_file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

region_map = {
    "规则 MCP 集成方法": "Tools",
    "任务管理工具处理方法": "Tasks",
    "项目管理相关": "Tasks",
    "公文管理相关": "Documents",
    "云存储相关工具处理方法": "Documents",
    "云盘与密码本工具处理方法": "Documents",
    "密码本相关工具处理方法": "Documents",
    "物联网相关工具处理方法": "IoT",
    "物联网相关工具扩展处理方法": "IoT",
    "园区管理模块工具处理方法": "Park",
    "园区企业服务相关处理方法": "Park",
    "工具处理私有方法": "User",
    "小科配置管理工具处理方法": "Notifications",
    "本地长效记忆工具": "User",
    "工作流相关工具处理方法": "Notifications",
    "通知中心工具处理方法": "Notifications"
}

file_lines = {v: [] for v in set(region_map.values())}
main_lines = []
in_region = None

header_lines = []
for index, line in enumerate(lines):
    if line.startswith("using ") or line.startswith("namespace ") or line.startswith("///"):
        header_lines.append(line)
        main_lines.append(line)
    elif "public class McpService : IMcpService" in line:
        main_lines.append(line.replace("public class McpService", "public partial class McpService"))
        break

header = "".join(header_lines) + "\npublic partial class McpService\n{\n"

# Precise line limits for ListToolsAsync (1-based lines, meaning index is line - 1)
# Starts with "    /// <inheritdoc />" at line 175 (index 174)
# Ends with "    }" at line 1432 (index 1431)
list_tools_start_idx = 174
list_tools_end_idx = 1431

for i in range(index + 1, len(lines)):
    line = lines[i]
    stripped = line.strip()
    
    # 1. Check exact bounds for ListToolsAsync
    if list_tools_start_idx <= i <= list_tools_end_idx:
        file_lines["Tools"].append(line)
        continue

    # 2. Check Regions
    if stripped.startswith("#region "):
        for k in region_map.keys():
            if k in stripped:
                in_region = region_map[k]
                file_lines[in_region].append(line)
                break
        if not in_region:
            main_lines.append(line)
        continue

    if stripped.startswith("#endregion"):
        if in_region:
            file_lines[in_region].append(line)
            in_region = None
        else:
            main_lines.append(line)
        continue

    # 3. Add to respective lists
    if in_region:
        file_lines[in_region].append(line)
    else:
        main_lines.append(line)

# Clean up double empty lines in main
cleaned_main = []
for line in main_lines:
    if line.strip() == "" and len(cleaned_main) > 0 and cleaned_main[-1].strip() == "":
        continue
    cleaned_main.append(line)

# Write main file
with open(mcp_file_path, "w", encoding="utf-8") as f:
    f.writelines(cleaned_main)

# Write partial files
for file_suffix, f_lines in file_lines.items():
    if not f_lines:
        continue
    f_path = os.path.join(base_path, f"McpService.{file_suffix}.cs")
    with open(f_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.writelines(f_lines)
        if f_lines[-1].strip() != "}":
            f.write("}\n")

print(f"Successfully split McpService into {len(file_lines)} partial classes using precise bounds.")
