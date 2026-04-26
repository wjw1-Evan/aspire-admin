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

    // ── 服务器错误 (Server) ──
    'SERVER_ERROR': '服务器内部错误',
};