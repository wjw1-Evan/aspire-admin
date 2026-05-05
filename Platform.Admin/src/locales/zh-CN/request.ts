export default {
    'request.error.validation': '验证错误',
    'request.error.login-failed': '登录失败，请检查用户名和密码',
    'request.error.token-expired': '登录已过期，请重新登录',
    'request.error.unknown': '未知错误',
    'request.error.network': '网络错误，请检查您的网络连接',
    'request.error.server': '服务器错误，请稍后重试',
    'request.error.forbidden': '无权访问此资源',
    'request.error.not-found': '未找到请求的资源',

    // ── 认证相关 (Authentication) ──
    'UNAUTHENTICATED': '未授权访问，请重新登录',
    'INVALID_CREDENTIALS': '用户名或密码错误',
    'CAPTCHA_REQUIRED': '请输入图形验证码',
    'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': '为了安全，此后登录需输入图形验证码',
    'CAPTCHA_INVALID': '图形验证码错误，请重新输入',
    'INVALID_TOKEN': '认证令牌无效或已过期',
    'TOKEN_EXPIRED': '登录已过期，请重新登录',
    'USER_INFO_INVALID': '用户信息无效',

    // ── 授权相关 (Authorization) ──
    'UNAUTHORIZED_ACCESS': '无权访问',
    'VIEW_PERMISSION_DENIED': '无权查看其他用户信息',
    'CURRENT_COMPANY_NOT_FOUND': '未找到当前企业信息',
    'MENU_ACCESS_DENIED': '无权访问该菜单',
    'MENU_SERVICE_NOT_CONFIGURED': '菜单访问服务未配置',
    'FORBIDDEN': '禁止访问',

    // ── 验证相关 (Validation) ──
    'VALIDATION_ERROR': '请求参数验证失败',
    'INVALID_OLD_PASSWORD': '原密码错误',

    // ── 资源相关 (Resource) ──
    'RESOURCE_NOT_FOUND': '资源不存在',
    'USER_NOT_FOUND': '用户不存在',
    'COMPANY_NOT_FOUND': '企业不存在',

    // ── 业务操作相关 (Business Operation) ──
    'INVALID_OPERATION': '操作无效',
    'OPERATION_NOT_SUPPORTED': '不支持的操作',
    'USER_NAME_EXISTS': '用户名已存在',
    'EMAIL_EXISTS': '邮箱已存在',
    'PHONE_NUMBER_EXISTS': '手机号已存在',
    'USER_NOT_AUTHENTICATED': '未找到用户认证信息',

    // ── 企业相关 (Company) ──
    'COMPANY_NOT_MEMBER': '您不是该企业的有效成员',
    'COMPANY_CREATOR_CANNOT_LEAVE': '您是该企业的创建者，不允许退出',
    'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': '您是企业唯一的管理员，请先转让管理员权限或注销企业',
    'COMPANY_INACTIVE': '企业未激活，请联系管理员',
    'COMPANY_EXPIRED': '企业已过期，请联系管理员续费',

    // ── 角色/权限相关 (Role/Permission) ──
    'ROLE_NOT_FOUND': '角色不存在',
    'ROLE_NAME_EXISTS': '角色名称已存在',
    'SYSTEM_ROLE_CANNOT_DELETE': '不能删除系统管理员角色',
    'CANNOT_REMOVE_LAST_ADMIN': '不能移除最后一个管理员的角色',
    'PERMISSION_NOT_FOUND': '权限不存在',
    'PERMISSION_CODE_EXISTS': '权限代码已存在',

    // ── 菜单/通知相关 (Menu/Notice) ──
    'MENU_NOT_FOUND': '菜单不存在',
    'MENU_NAME_EXISTS': '菜单名称已存在',
    'CANNOT_DELETE_MENU_WITH_CHILDREN': '不能删除有子菜单的菜单，请先删除子菜单',
    'NOTICE_NOT_FOUND': '通知不存在',

    // ── 用户/企业扩展 (User/Company Extended) ──
    'USER_INACTIVE': '用户已被禁用',
    'CANNOT_DELETE_SELF': '不能删除自己的账户',
    'CANNOT_DELETE_CURRENT_USER': '不能删除当前登录用户',
    'CANNOT_MODIFY_OWN_ROLE': '不能修改自己的角色',
    'MAX_USERS_REACHED': '已达到最大用户数限制',
    'COMPANY_CODE_EXISTS': '企业代码已存在',
    'INVALID_COMPANY_CODE': '企业代码格式不正确',
    'COMPANY_REQUIRED': '未找到企业信息',

    // ── 组织架构相关 (Organization) ──
    'ORGANIZATION_NOT_FOUND': '组织节点不存在',
    'ORGANIZATION_NAME_EXISTS': '组织节点名称已存在',
    'ORGANIZATION_CODE_EXISTS': '组织节点编码已存在',
    'PARENT_CANNOT_BE_SELF': '父级不能选择当前节点',
    'PARENT_CANNOT_BE_DESCENDANT': '父级不能选择当前节点的子节点',
    'CANNOT_DELETE_WITH_CHILDREN': '请先删除下级节点后再删除当前节点',

    // ── 格式验证相关 (Format Validation) ──
    'INVALID_EMAIL_FORMAT': '邮箱格式不正确',
    'INVALID_PHONE_FORMAT': '手机号格式不正确',
    'INVALID_USERNAME_FORMAT': '用户名格式不正确',
    'PASSWORD_TOO_SHORT': '密码长度不能少于6个字符',
    'PASSWORD_TOO_LONG': '密码长度不能超过50个字符',

    // ── 通用操作 (General Operation) ──
    'OPERATION_FAILED': '操作失败',

    // ── 文件相关 (File) ──
    'AVATAR_TOO_LARGE': '头像数据过大，请选择小于 2MB 的图片',
    'FILE_NOT_FOUND': '文件不存在',
    'FILE_THUMBNAIL_NOT_SUPPORTED': '该文件类型不支持生成缩略图',
    'FILE_THUMBNAIL_GENERATION_FAILED': '生成缩略图失败',
    'FILE_THUMBNAIL_NOT_AVAILABLE': '缩略图不存在且无法生成',
    'FILE_THUMBNAIL_DELETED': '缩略图文件不存在或已被删除',
    'FILE_PREVIEW_NOT_SUPPORTED': '该文件类型不支持预览',
    'FILE_PREVIEW_TYPE_NOT_SUPPORTED': '不支持的预览类型',
    'FILE_PREVIEW_GENERATION_FAILED': '生成预览失败',
    'MODULE_REQUIRED': '模块不能为空',
    'DATA_TYPE_REQUIRED': '数据类型不能为空',
    'UNSUPPORTED_MODULE': '不支持的模块',
    'UNSUPPORTED_DATA_TYPE': '不支持的数据类型',
    'PROJECT_NOT_FOUND': '项目不存在',
    'PROJECT_DELETE_UNAUTHORIZED': '无权删除此项目',
    'PROJECT_MEMBER_ALREADY_EXISTS': '该用户已经是项目成员',

    // ── 服务器错误 (Server) ──
    'SERVER_ERROR': '服务器内部错误',

    // ── 公文相关 (Document) ──
    'DOCUMENT_NOT_FOUND': '公文不存在',
    'WORKFLOW_INSTANCE_NOT_FOUND': '流程实例不存在',
    'WORKFLOW_DEFINITION_NOT_FOUND': '流程定义不存在',
    'FORM_DEFINITION_NOT_FOUND': '表单定义不存在',
    'DOCUMENT_TITLE_REQUIRED': '公文标题不能为空',
    'WORKFLOW_DEFINITION_ID_REQUIRED': '流程定义ID不能为空',
    'DOCUMENT_ID_REQUIRED': '文档ID不能为空',
    'REQUEST_PARAM_REQUIRED': '请求参数不能为空',
    'REJECT_REASON_REQUIRED': '拒绝原因不能为空',
    'RETURN_TARGET_NODE_REQUIRED': '退回目标节点不能为空',
    'RETURN_REASON_REQUIRED': '退回原因不能为空',
    'DELEGATE_TARGET_USER_REQUIRED': '转办目标用户不能为空',
    'WORKFLOW_NODE_NOT_CONFIGURED': '流程节点未配置表单定义ID',
    'NO_PENDING_NODE': '流程实例当前无待处理节点',

    // ── 流程图形验证相关 (Workflow Graph Validation) ──
    'INVALID_WORKFLOW_GRAPH': '流程图形定义不合法',
    'APPROVAL_NODE_MISSING_CONFIG': '审批节点缺少审批配置',
    'APPROVAL_NODE_EMPTY_APPROVERS': '审批节点审批人规则不能为空',
    'WORKFLOW_NODES_EMPTY': '流程节点不能为空',
    'DUPLICATE_NODE_ID': '存在重复的节点ID',
    'MISSING_START_NODE': '流程必须包含开始节点',
    'MULTIPLE_START_NODES': '流程只能包含一个开始节点',
    'MISSING_END_NODE': '流程必须包含结束节点',
    'EDGE_SOURCE_TARGET_EMPTY': '连接线源或目标节点为空',
    'EDGE_SELF_LOOP_NOT_ALLOWED': '连接线源和目标不能相同（不支持自环）',
    'EDGE_SOURCE_NOT_FOUND': '连接线源节点不存在',
    'EDGE_TARGET_NOT_FOUND': '连接线目标节点不存在',
    'DUPLICATE_EDGE': '存在重复的连接线',
    'UNREACHABLE_NODES': '存在从开始节点不可达的节点',
    'NO_PATH_TO_END_NODE': '从开始节点无法到达任何结束节点',
    'START_NODE_NO_OUTGOING': '开始节点没有出边',
    'END_NODE_NO_INCOMING': '结束节点没有入边',
    'NODE_NO_OUTGOING': '节点没有出边',
    'NODE_NO_INCOMING': '节点没有入边',
    'UNSUPPORTED_NODE_TYPE': '不支持的节点类型',
    'APPROVAL_TIMEOUT_NEGATIVE': '审批节点超时时间必须为非负数',
    'CONDITION_NODE_NO_OUTGOING': '条件节点缺少出边',
    'CONDITION_NODE_INVALID_PATHS': '条件节点的出边需包含条件或默认路径',
};